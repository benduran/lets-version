/**
 * @typedef {import('./types.js').ReleaseAsPresets} ReleaseAsPresets
 */

import semver from 'semver';
import semverUtils from 'semver-utils';

import { BumpRecommendation, BumpType, PackageInfo } from './types.js';

/**
 * Checks whether or not a package.json key is allowed to be updated / managed by "lets-version"
 *
 * @param {string} key
 * @param {boolean} updatePeer
 * @param {boolean} updateOptional
 *
 * @returns {boolean}
 */
export function isPackageJSONDependencyKeySupported(key, updatePeer, updateOptional) {
  if (key === 'dependencies' || key === 'devDependencies') return true;
  if (key === 'peerDependencies' && updatePeer) return true;
  if (key === 'optionalDependencies' && updateOptional) return true;

  return false;
}

/**
 * Given a parsed packageInfo object and some parameters,
 * performs a semver.inc()
 *
 * @param {PackageInfo} packageInfo
 * @param {string | null} from
 * @param {BumpType} bumpType
 * @param {ReleaseAsPresets} releaseAs
 * @param {string} [preid]
 *
 * @returns {BumpRecommendation}
 */
export function getBumpRecommendationForPackageInfo(packageInfo, from, bumpType, releaseAs, preid) {
  const isExactRelease = Boolean(semver.coerce(releaseAs));

  const newBump = isExactRelease
    ? releaseAs
    : semver.inc(
        packageInfo.version,
        preid ? 'prerelease' : bumpType === BumpType.PATCH ? 'patch' : bumpType === BumpType.MINOR ? 'minor' : 'major',
        undefined,
        preid,
      );

  return new BumpRecommendation(packageInfo, from, (Boolean(from) && newBump) || packageInfo.version, bumpType);
}

/**
 * @typedef {Object} SynchronizeBumpsReturnType
 * @property {BumpRecommendation[]} bumps
 * @property {Map<string, BumpRecommendation>} bumpsByPackageName
 * @property {PackageInfo[]} packages
 */

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
 * @param {boolean} updatePeer
 * @param {boolean} updateOptional
 *
 * @returns {SynchronizeBumpsReturnType}
 */
export function synchronizeBumps(bumps, bumpsByPackageName, allPackages, releaseAs, preid, updatePeer, updateOptional) {
  const clonedBumpsByPackageName = new Map(bumpsByPackageName.entries());

  const writeToDisk = new Map(bumps.map(b => [b.packageInfo.name, b.packageInfo]));

  for (const bump of bumps) {
    const toWrite = writeToDisk.get(bump.packageInfo.name);
    if (!toWrite) continue;

    const version = semver.gt(bump.to, toWrite.version) ? bump.to : toWrite.version;
    bump.packageInfo.version = bump.to;
    bump.packageInfo.pkg.version = bump.to;
    writeToDisk.set(
      toWrite.name,
      new PackageInfo({
        ...toWrite,
        // @ts-ignore
        pkg: {
          ...toWrite.pkg,
          version,
        },
        version,
      }),
    );
  }

  const updatedParents = Array.from(writeToDisk.values());
  for (const updatedParent of updatedParents) {
    const parentBumpType = clonedBumpsByPackageName.get(updatedParent.name);
    if (!parentBumpType) continue;

    // loop through all packages to find out which ones have the updatedParent as a dep
    for (const p of allPackages) {
      for (const key in p.pkg) {
        if (!isPackageJSONDependencyKeySupported(key, updatePeer, updateOptional)) continue;
        // there's a match. let's update the dep field

        // @ts-ignore
        const existingSemverStr = p.pkg[key][updatedParent.name] || '';
        if (!existingSemverStr) continue;

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

        const newSemverStr = `${firstDetailOperator}${updatedParent.version}`;

        // @ts-ignore
        p.pkg[key][updatedParent.name] = newSemverStr;

        // now we need to try and apply a bump for this dependent (p)
        // if it doesn't already have one

        /** @type {BumpRecommendation} */
        let childBumpRec;

        const existingBump = clonedBumpsByPackageName.get(p.name);
        if (existingBump) {
          existingBump.type = Math.max(existingBump.type, parentBumpType.type);
          childBumpRec = existingBump;
        } else {
          const childBumpType = parentBumpType.type;
          childBumpRec = getBumpRecommendationForPackageInfo(p, p.version, childBumpType, releaseAs, preid);

          clonedBumpsByPackageName.set(p.name, childBumpRec);
        }

        // @ts-ignore
        childBumpRec.packageInfo.pkg[key][updatedParent.name] = newSemverStr;

        const recursedResults = synchronizeBumps(
          [childBumpRec],
          clonedBumpsByPackageName,
          allPackages,
          releaseAs,
          preid,
          updatePeer,
          updateOptional,
        );

        recursedResults.packages.forEach(r => writeToDisk.set(r.name, r));
      }
    }
  }

  return {
    bumps: Array.from(clonedBumpsByPackageName.values()),
    bumpsByPackageName: clonedBumpsByPackageName,
    packages: Array.from(writeToDisk.values()),
  };
}
