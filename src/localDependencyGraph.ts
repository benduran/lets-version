import os from 'node:os';

import appRootPath from 'app-root-path';
import chalk from 'chalk';

import { fixCWD } from './cwd.js';
import { getPackages } from './getPackages.js';
import { DepType, LocalDependencyGraphNode } from './types.js';
import { isPackageJSONDependencyKeySupported } from './util.js';

/**
 * Scans the repository for all packages
 * and builds a local-only dependency graph
 * representation
 */
export async function buildLocalDependencyGraph(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const allPackagesByName = new Map(
    allPackages.map(p => [p.name, new LocalDependencyGraphNode({ ...p, depType: 'self', deps: [] })]),
  );

  const makeMagic = (node: LocalDependencyGraphNode, visited: Set<string>, stack: Set<string>) => {
    if (stack.has(node.name)) {
      // Cycle detected
      throw new Error(
        `a cycle was detected in your dependency graph. check the package.json files for the following packages:${
          os.EOL
        }${chalk.magenta('➡️')} ${chalk.magenta(Array.from(stack).join(' ➡️ '))}`,
      );
    }

    if (visited.has(node.name)) {
      return;
    }

    visited.add(node.name);
    stack.add(node.name);

    for (const pjsonKey of Object.keys(node.pkg)) {
      if (!isPackageJSONDependencyKeySupported(pjsonKey, true, true)) continue;

      // we are now in dep-land
      for (const depname of Object.keys(node.pkg[pjsonKey] ?? {})) {
        const isMonorepoDep = allPackagesByName.get(depname);
        if (!isMonorepoDep) continue;

        // we have a monorepo-specific dep
        const monorepoDepNode = new LocalDependencyGraphNode({
          ...isMonorepoDep,
          depType: pjsonKey as DepType,
          deps: [],
        });

        node.deps.push(monorepoDepNode);
        makeMagic(monorepoDepNode, visited, stack);
      }
    }

    stack.delete(node.name);
  };

  for (const node of allPackagesByName.values()) {
    makeMagic(node, new Set(), new Set());
  }

  return Array.from(allPackagesByName.values());
}
