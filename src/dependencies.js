import appRootPath from 'app-root-path';
import semver from 'semver';

import { fixCWD } from './cwd.js';
import { gitCurrentSHA } from './git.js';
import { buildLocalDependencyGraph } from './localDependencyGraph.js';
import { BumpRecommendation, BumpType, ReleaseAsPresets } from './types.js';

/**
 * @typedef {import('./types.js').PackageInfo} PackageInfo
 */

/**
 * Checks whether or not a package.json key is allowed to be updated / managed by "lets-version"
 *
 * @param {string} key
 * @param {boolean} updatePeer
 * @param {boolean} updateOptional
 *
 * @returns {boolean}
 */

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
 * @typedef {Object} SynchronizeBumpsReturnType
 * @property {BumpRecommendation[]} bumps
 * @property {Map<string, BumpRecommendation>} bumpsByPackageName
 * @property {PackageInfo[]} packages
 */

/**
 * Given a map of bump recommendations,
 * ensures that only a single for each package
 * name is taken, always using the maximum bump
 * recommendation possible
 *
 * @param {Map<string, BumpRecommendation[]>} byName
 *
 * @returns {BumpRecommendation[]}
 */
function dedupBumpsAndTakeMax(byName) {
  /**
   * @type {BumpRecommendation[]}
   */
  const deduped = [];
  for (const proposedBumpsForPackage of byName.values()) {
    const maxBump = proposedBumpsForPackage.reduce(
      // @ts-ignore
      (prev, proposedBump) => (prev.type > proposedBump.type ? prev : proposedBump),
      {},
    );
    // @ts-ignore
    deduped.push(maxBump);
  }

  return deduped;
}

/**
 * Applies bumps to top-level packages, then attempts to recursively
 * synchronize package versions and applies bumps if a package hasn't already
 * been bumped (but might receive one as a result from this operation)
 *
 * @param {BumpRecommendation[]} bumps
 * @param {Map<string, BumpRecommendation>} bumpsByPackageName
 * @param {PackageInfo[]} allPackages
 * @param {ReleaseAsPresets} releaseAs
 * @param {string | undefined} preid
 * @param {boolean} uniqify
 * @param {boolean} updatePeer
 * @param {boolean} updateOptional
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<SynchronizeBumpsReturnType>}
 */
export async function synchronizeBumps(
  bumps,
  bumpsByPackageName,
  allPackages,
  releaseAs,
  preid,
  uniqify,
  updatePeer,
  updateOptional,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);

  // we will push all bumps that will actually need to be written
  // to disk to this array. This means we'll need to recursively update
  // children if, say, PackageA was bumped, and PackageB depends on it.
  // This would mean PackageB would have to receive the same type of bump
  // PackageA received, unless PackageB already received a bump and it was a
  // "bigger" type than PackageA would have forced. Repeat, ad nauseum 🤣.
  const bumpsIncludingTransitive = [...bumps];
  // const clonedBumpsByPackageName = new Map(bumpsByPackageName.entries());
  const graph = await buildLocalDependencyGraph(fixedCWD);

  for (const bump of bumps) {
    for (const topLevelPackage of graph) {
      bumpsIncludingTransitive.push(...topLevelPackage.getBubbleBumpRec(bump));
    }
  }

  // remove duplicates and always take the larger of any matches
  /**
   * @type {Map<string, BumpRecommendation[]>}
   */
  const byName = new Map();

  for (const bump of bumpsIncludingTransitive) {
    if (!byName.has(bump.packageInfo.name)) byName.set(bump.packageInfo.name, []);
    byName.set(bump.packageInfo.name, [...(byName.get(bump.packageInfo.name) ?? []), bump]);
  }

  let deduped = dedupBumpsAndTakeMax(byName);

  // if there are more bumps than what we started with, we need to
  // go through the process again to ensure everything is flushed out

  if (deduped.length > bumps.length) {
    const result = await synchronizeBumps(
      deduped,
      new Map(deduped.map(d => [d.packageInfo.name, d])),
      allPackages,
      releaseAs,
      preid,
      uniqify,
      updatePeer,
      updateOptional,
      fixedCWD,
    );
    deduped = result.bumps;
  }

  return {
    bumps: deduped,
    bumpsByPackageName: new Map(deduped.map(f => [f.packageInfo.name, f])),
    packages: deduped.map(f => f.packageInfo),
  };
}
