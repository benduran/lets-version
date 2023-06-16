/**
 * @typedef {import('./types.js').PackageInfo} PackageInfo
 * @typedef {import('./types.js').DepType} DepType
 */

import appRootPath from 'app-root-path';

import { fixCWD } from './cwd.js';
import { getPackages } from './getPackages.js';
import { LocalDependencyGraphNode } from './types.js';
import { isPackageJSONDependencyKeySupported } from './util.js';

/**
 * Given a single package info, attempts
 * to build the local-only graph. Use
 * this function for recursion
 *
 * @param {PackageInfo} packageInfo
 * @param {Map<string, PackageInfo>} allPackagesByName
 * @param {DepType} depType
 *
 * @returns {LocalDependencyGraphNode}
 */
function buildGraphForPackageInfo(packageInfo, allPackagesByName, depType) {
  const node = new LocalDependencyGraphNode({
    ...packageInfo,
    depType,
    deps: [], // TODO: Populate me
  });

  for (const pkey in packageInfo.pkg) {
    if (!isPackageJSONDependencyKeySupported(pkey, true, true)) continue;

    const pkeyDeps = packageInfo.pkg[pkey] ?? {};
    const pkeyDepsNames = Object.keys(pkeyDeps);
    // loop through and find any local-only deps
    for (const pkeyDepName of pkeyDepsNames) {
      const localMatch = allPackagesByName.get(pkeyDepName);
      if (!localMatch) continue;

      // @ts-ignore
      node.deps.push(buildGraphForPackageInfo(localMatch, allPackagesByName, pkey));
    }
  }

  return node;
}

/**
 * Scans the repository for all packages
 * and builds a local-only dependency graph
 * representation
 *
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<LocalDependencyGraphNode[]>}
 */
export async function buildLocalDependencyGraph(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  /** @type {LocalDependencyGraphNode[]} */
  const nodes = [];

  const allPackages = await getPackages(fixedCWD);
  const allPackagesByName = new Map(allPackages.map(p => [p.name, p]));

  for (const p of allPackages) {
    nodes.push(buildGraphForPackageInfo(p, allPackagesByName, 'self'));
  }

  return nodes;
}
