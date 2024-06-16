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
export async function buildLocalDependencyGraph(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const allPackagesByName = new Map(
    allPackages.map(p => [p.name, new LocalDependencyGraphNode({ ...p, depType: 'self', deps: [] })]),
  );

  const cycles: Array<[LocalDependencyGraphNode, LocalDependencyGraphNode]> = [];

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
          depType: pjsonKey as DepType,
          deps: [],
        });

        // before pushing, we need to check to see if
        // there are any entries with this node name that already
        // exist. if there are, it means the user has a cycle in their
        // local dep graph, which will cause an infinite recursion loop
        // to occur here
        const cycleDetected = node.deps.some(d => d.name === monorepoDepNode.name);

        if (cycleDetected) {
          cycles.push([node, monorepoDepNode]);
          continue;
        }

        node.deps.push(monorepoDepNode);
        makeMagic(monorepoDepNode);
      }
    }
  };
  for (const node of allPackagesByName.values()) {
    makeMagic(node);
  }

  return { cycles, depGraph: Array.from(allPackagesByName.values()) };
}
