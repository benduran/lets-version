import appRootPath from 'app-root-path';

import { fixCWD } from './cwd.js';
import { getPackages } from './getPackages.js';
import { DepType, LocalDependencyGraphNode } from './types.js';
import { isPackageJSONDependencyKeySupported } from './util.js';

/**
 * Scans the repository for all packages
 * and builds a local-only dependency graph
 * representation
 */
export async function buildLocalDependencyGraph(cwd = appRootPath.toString()): Promise<LocalDependencyGraphNode[]> {
  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const allPackagesByName = new Map(
    allPackages.map(p => [p.name, new LocalDependencyGraphNode({ ...p, depType: 'self', deps: [] })]),
  );

  const makeMagic = (node: LocalDependencyGraphNode) => {
    for (const pjsonKey of Object.keys(node.pkg)) {
      if (!isPackageJSONDependencyKeySupported(pjsonKey, true, true)) continue;

      // we are now in dep-land
      for (const depname of Object.keys(node.pkg[pjsonKey] ?? {})) {
        const isMonorepoDep = allPackagesByName.get(depname);
        if (!isMonorepoDep) continue;

        // we have a monorepo-specific dep
        const monorepoDepNode = new LocalDependencyGraphNode({
          ...isMonorepoDep,
          depType: depname as DepType,
          deps: [],
        });
        node.deps.push(monorepoDepNode);
        makeMagic(monorepoDepNode);
      }
    }
  };
  for (const node of allPackagesByName.values()) {
    makeMagic(node);
  }

  return Array.from(allPackagesByName.values());
}
