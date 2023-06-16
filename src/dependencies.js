import appRootPath from 'app-root-path';
import semver from 'semver';
import semverUtils from 'semver-utils';

import { fixCWD } from './cwd.js';
import { gitCurrentSHA } from './git.js';
import { BumpRecommendation, BumpType, PackageInfo, ReleaseAsPresets } from './types.js';
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
          childBumpRec = await getBumpRecommendationForPackageInfo(
            p,
            p.version,
            childBumpType,
            releaseAs,
            preid,
            uniqify,
            fixedCWD,
          );

          clonedBumpsByPackageName.set(p.name, childBumpRec);
        }

        // @ts-ignore
        childBumpRec.packageInfo.pkg[key][updatedParent.name] = newSemverStr;

        const recursedResults = await synchronizeBumps(
          [childBumpRec],
          clonedBumpsByPackageName,
          allPackages,
          releaseAs,
          preid,
          uniqify,
          updatePeer,
          updateOptional,
          fixedCWD,
        );

        recursedResults.packages.forEach(r => writeToDisk.set(r.name, r));
        recursedResults.bumps.forEach(b => clonedBumpsByPackageName.set(b.packageInfo.name, b));
      }
    }
  }

  return {
    bumps: Array.from(clonedBumpsByPackageName.values()),
    bumpsByPackageName: clonedBumpsByPackageName,
    packages: Array.from(writeToDisk.values()),
  };
}
