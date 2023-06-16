/**
 * @typedef {import('./types.js').LocalDependencyGraphNode} LocalDependencyGraphNode
 * @typedef {import('./types.js').PackageInfo} PackageInfo
 */

import appRootPath from 'app-root-path';
import semver from 'semver';
import semverUtils from 'semver-utils';

import { fixCWD } from './cwd.js';
import { gitCurrentSHA } from './git.js';
import { buildLocalDependencyGraph } from './localDependencyGraph.js';
import { BumpRecommendation, BumpType, ReleaseAsPresets } from './types.js';
import { isPackageJSONDependencyKeySupported } from './util.js';

/**
 * Given a parsed packageInfo object and some parameters,
 * performs a semver.inc()
 *
 * @param {PackageInfo} packageInfo
 * @param {string | null} from
 * @param {BumpType} bumpType
 * @param {ReleaseAsPresets} [releaseAs]
 * @param {string} [preid]
 * @param {boolean} [uniqify]
 * @param {string} [cwd=appRooPath.toString()]
 *
 * @returns {Promise<BumpRecommendation>}
 */
export async function getBumpRecommendationForPackageInfo(
  packageInfo,
  from,
  bumpType,
  releaseAs,
  preid,
  uniqify,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);
  const isExactRelease = Boolean(semver.coerce(releaseAs));

  let isPrerelease = false;
  let bumpTypeToUse = bumpType;
  if (isExactRelease) bumpTypeToUse = BumpType.EXACT;
  else {
    switch (releaseAs) {
      case ReleaseAsPresets.ALPHA:
      case ReleaseAsPresets.BETA:
        isPrerelease = true;
        bumpTypeToUse = BumpType.PRERELEASE;
        preid = preid || releaseAs;
        break;
      case ReleaseAsPresets.MAJOR:
        bumpTypeToUse = BumpType.MAJOR;
        break;
      case ReleaseAsPresets.MINOR:
        bumpTypeToUse = BumpType.MINOR;
        break;
      case ReleaseAsPresets.PATCH:
        bumpTypeToUse = BumpType.PATCH;
        break;
      default:
        break;
    }
  }

  if (preid) isPrerelease = true;

  const newBump = isExactRelease
    ? releaseAs
    : semver.inc(
        packageInfo.version,
        isPrerelease
          ? 'prerelease'
          : bumpTypeToUse === BumpType.PATCH
          ? 'patch'
          : bumpTypeToUse === BumpType.MINOR
          ? 'minor'
          : 'major',
        undefined,
        preid,
      );

  const fromToUse = isPrerelease || releaseAs ? packageInfo.version : from;
  let to = Boolean(fromToUse) && newBump ? newBump : packageInfo.version;

  if (uniqify) {
    to += `.${await gitCurrentSHA(fixedCWD)}`;
  }

  return new BumpRecommendation(packageInfo, fromToUse, to, bumpTypeToUse);
}

/**
 * Sorts nodes by depth and then sorts each dep at any level
 *
 * @param {LocalDependencyGraphNode[]} nodes
 *
 * @returns {LocalDependencyGraphNode[]}
 */
function sortNodes(nodes) {
  return nodes
    .sort((a, b) => b.localDepDepth - a.localDepDepth)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(node => {
      node.deps = sortNodes(node.deps);
      return node;
    });
}

/**
 * Applies bumps to top-level packages, then attempts to recursively
 * synchronize package versions and applies bumps if a package hasn't already
 * been bumped (but might receive one as a result from this operation)
 *
 * @param {Object} opts
 * @param {BumpRecommendation[]} opts.bumps
 * @param {PackageInfo[]} opts.allPackages
 * @param {ReleaseAsPresets} opts.releaseAs
 * @param {string | undefined} opts.preid
 * @param {boolean} opts.uniqify
 * @param {boolean} opts.updatePeer
 * @param {boolean} opts.updateOptional
 * @param {string} [opts.cwd=appRootPath.toString()]
 *
 * @returns {Promise<BumpRecommendation[]>}
 */
export async function synchronizeBumps({
  allPackages,
  bumps,
  cwd = appRootPath.toString(),
  preid,
  releaseAs,
  uniqify,
  updatePeer,
  updateOptional,
}) {
  const fixedCWD = fixCWD(cwd);
  const nodes = await buildLocalDependencyGraph({ allPackages, cwd: fixedCWD, updatePeer, updateOptional });
  const bumpsByPackageName = new Map(bumps.map(b => [b.packageInfo.name, b]));

  /**
   * Function that computes which bump a dependency node
   * should receive, based on its parent (if it has a parent),
   * and takes the greater of its bump or its parent's bump.
   * Meant to be called recursively
   *
   * @param {LocalDependencyGraphNode} node
   */
  const computeBumpForNode = async node => {
    const myNodeBump = bumpsByPackageName.get(node.name);

    if (!node.deps.length) return myNodeBump;

    // walk the tree. deepest dep that has a bump bubbles to the top
    for (const childNode of sortNodes(node.deps)) {
      // either my child has a bump or I have a bump.
      // if neither is the case, skip
      const childBump = await computeBumpForNode(childNode);
      if (!childBump) continue;

      const myBumpToInsert = await getBumpRecommendationForPackageInfo(
        node,
        myNodeBump?.from ?? node.version,
        Math.max(myNodeBump?.type ?? -1, childBump.type),
        releaseAs,
        preid,
        uniqify,
        fixedCWD,
      );

      bumpsByPackageName.set(node.name, myBumpToInsert);
    }
  };

  for (const node of sortNodes(nodes)) await computeBumpForNode(node);

  // the bumps map should now be 100% up-to-date, as we walked through
  // the dependency graph to ensure all updates were in there.
  // now, we need to iterate through each packageInfo.pkg and apply semver
  // upgrades, as needed

  for (const bump of bumpsByPackageName.values()) {
    for (const pjsonKey in bump.packageInfo.pkg) {
      if (!isPackageJSONDependencyKeySupported(pjsonKey, updatePeer, updateOptional)) continue;

      // we're in a valid, supported dependencies key. loop through the deps and update where possible
      for (const depName of Object.keys(bump.packageInfo.pkg[pjsonKey] ?? {})) {
        const foundBump = bumpsByPackageName.get(depName);
        if (!foundBump) continue;

        // @ts-ignore
        const existingSemverStr = bump.packageInfo.pkg[pjsonKey][depName];
        const semverDetails = semverUtils.parseRange(existingSemverStr);

        // if there are more than one semverDetails because user has a complicated range,
        // we will only take the first one if it's something we can work with in the update.
        // if it's not something reasonable, it will automatically become "^"
        const [firstDetail] = semverDetails;
        let firstDetailOperator = firstDetail?.operator || '^';
        if (
          !firstDetailOperator.startsWith('>=') &&
          !firstDetailOperator.startsWith('^') &&
          !firstDetailOperator.startsWith('~')
        ) {
          firstDetailOperator = '^';
        }

        const newSemverStr = `${firstDetailOperator}${foundBump.to}`;

        // @ts-ignore
        bump.packageInfo.pkg[pjsonKey][depName] = newSemverStr;
      }
    }
  }

  return Array.from(bumpsByPackageName.values());
}
