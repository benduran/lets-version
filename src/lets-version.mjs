/**
 * @typedef {import('./types.mjs').GitCommitWithConventional} GitCommitWithConventional
 * @typedef {import('./types.mjs').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.mjs').PublishTagInfo} PublishTagInfo
 * @typedef {import('./types.mjs').PackageInfo} PackageInfo
 */

import appRootPath from 'app-root-path';
import semver from 'semver';

import { fixCWD } from './cwd.mjs';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.mjs';
import {
  getAllFilesChangedSinceTagInfos,
  getLastKnownPublishTagInfoForAllPackages,
  gitConventionalForAllPackages,
} from './git.mjs';
import { conventionalCommitToBumpType } from './parser.mjs';
import { BumpRecommendation, BumpType } from './types.mjs';

export * from './getPackages.mjs';
export * from './git.mjs';
export * from './parser.mjs';

/**
 * Given an optiona array of package names, reads the latest
 * git tag that was used in a previous version bump operation.
 *
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<PublishTagInfo[]>}
 */
export async function getLastVersionTagsByPackageName(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = filterPackagesByNames(await getPackages(fixedCWD), names);

  if (!filteredPackages) return [];

  return getLastKnownPublishTagInfoForAllPackages(filteredPackages, fixedCWD);
}

/**
 * Gets a list of all files that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 *
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 * @returns {Promise<string[]>}
 */
export async function getChangedFilesSinceBump(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);
  const filteredPackages = filterPackagesByNames(await getPackages(fixedCWD), names);

  if (!filteredPackages) return [];

  const tagResults = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, fixedCWD);

  return getAllFilesChangedSinceTagInfos(tagResults, fixedCWD);
}

/**
 * Gets a list of all packages that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<PackageInfo[]>}
 */
export async function getChangedPackagesSinceBump(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = filterPackagesByNames(await getPackages(fixedCWD), names);

  if (!filteredPackages) return [];

  const tagInfos = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, fixedCWD);
  const changedFiles = await getAllFilesChangedSinceTagInfos(tagInfos, fixedCWD);

  return getAllPackagesChangedBasedOnFilesModified(changedFiles, filteredPackages, fixedCWD);
}

/**
 * Parses commits since last publish for a specific package or set of packages
 * and returns them represented as Conventional Commits objects
 *
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function getConventionalCommitsByPackage(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = filterPackagesByNames(await getPackages(fixedCWD), names);

  if (!filteredPackages.length) return [];

  return gitConventionalForAllPackages(filteredPackages, fixedCWD);
}

/**
 * Given an optional list of package names, parses the git history
 * since the last bump operation and suggests a bump.
 *
 * NOTE: It is possible for your bump recommendation to not change.
 * If this is the case, this means that your particular package has never had a version bump by the lets-version library.
 *
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<BumpRecommendation[]>}
 */
export async function getRecommendedBumpsByPackage(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = filterPackagesByNames(await getPackages(fixedCWD), names);

  if (!filteredPackages) return [];

  const filteredPackagesByName = new Map(filteredPackages.map(p => [p.name, p]));

  const conventional = await gitConventionalForAllPackages(filteredPackages, fixedCWD);
  const tagsForPackagesMap = new Map(
    (await getLastKnownPublishTagInfoForAllPackages(filteredPackages, fixedCWD)).map(t => [t.packageName, t]),
  );

  // we need to gather the commit types per-package, then pick the "greatest" or "most disruptive" one
  // as the one that will determine the bump to be applied
  /** @type {Map<string, BumpType>} */
  const bumpTypeByPackageName = new Map();

  for (const commit of conventional) {
    const bumpType = Math.max(
      bumpTypeByPackageName.get(commit.packageInfo.name) ?? BumpType.PATCH,
      conventionalCommitToBumpType(commit),
    );
    bumpTypeByPackageName.set(commit.packageInfo.name, bumpType);
  }

  /** @type {BumpRecommendation[]} */
  const out = [];

  for (const [packageName, bumpType] of bumpTypeByPackageName.entries()) {
    const packageInfo = filteredPackagesByName.get(packageName);
    if (!packageInfo) {
      throw new Error(`No package info for ${packageName} was loaded in memory. Unable to get recommended bump.`);
    }
    const tagInfo = tagsForPackagesMap.get(packageName);

    const newBump = semver.inc(
      packageInfo.version,
      bumpType === BumpType.PATCH ? 'patch' : bumpType === BumpType.MINOR ? 'minor' : 'major',
    );

    out.push(
      new BumpRecommendation(
        packageInfo,
        tagInfo?.sha ? packageInfo.version : null,
        newBump || packageInfo.version,
        bumpType,
      ),
    );
  }

  return out;
}
