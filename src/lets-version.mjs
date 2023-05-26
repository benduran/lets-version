/**
 * @typedef {import('./types.mjs').PublishTagInfo} PublishTagInfo
 * @typedef {import('./types.mjs').PackageInfo} PackageInfo
 * @typedef {import('./types.mjs').GitCommitWithConventional} GitCommitWithConventional
 */

import appRootPath from 'app-root-path';

import { fixCWD } from './cwd.mjs';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.mjs';
import {
  getAllFilesChangedSinceTagInfos,
  getLastKnownPublishTagInfoForAllPackages,
  gitCommitsSince,
  gitLastKnownPublishTagInfoForPackage,
} from './git.mjs';
import { parseToConventional } from './parser.mjs';
import { BumpRecommendation, BumpType, GitCommitWithConventionalAndPackageInfo } from './types.mjs';

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
  const filteredPackagesMap = new Map(filteredPackages.map(f => [f.name, f]));

  if (!filteredPackages.length) return [];

  const tagInfos = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, fixedCWD);
  const commits = (
    await Promise.all(
      tagInfos.map(async t => {
        const results = await gitCommitsSince(t.sha, fixedCWD);
        const conventional = parseToConventional(results);

        return conventional.map(c => {
          const foundPackage = filteredPackagesMap.get(t.packageName);

          if (!foundPackage) {
            throw new Error(`Did not find ${t.packageName} in the internal map in getConventionalCommitsByPackage`);
          }

          return new GitCommitWithConventionalAndPackageInfo(
            c.author,
            c.date,
            c.email,
            c.message,
            c.sha,
            c.conventional,
            foundPackage,
          );
        });
      }),
    )
  ).flat();

  return commits;
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

  return [];
  // const result = await Promise.all(
  //   filteredPackages.map(async p => {
  //     const { version: currentVersion } = p;

  //     const lastTagInfo = await gitLastKnownPublishTagInfoForPackage(p, fixedCWD);

  //     // package was never bumped before using the lets-version utility,
  //     // so we will treat this as a special case
  //     if (!lastTagInfo?.sha) {
  //       return new BumpRecommendation(p, null, currentVersion, BumpType.FIRST);
  //     }

  //     const commitsSince = parseToConventional(await gitCommitsSince(lastTagInfo.sha, fixedCWD));
  //     console.info('commitsSince', JSON.stringify(commitsSince, null, 2));
  //   }),
  // );

  // return result;
}
