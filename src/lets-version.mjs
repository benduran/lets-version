/**
 * @typedef {import('./types.mjs').GitCommitWithConventional} GitCommitWithConventional
 * @typedef {import('./types.mjs').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.mjs').PublishTagInfo} PublishTagInfo
 * @typedef {import('type-fest').PackageJson} PackageJson
 */

import appRootPath from 'app-root-path';
import { detect as detectPM } from 'detect-package-manager';
import { execaCommand } from 'execa';
import fs from 'fs-extra';
import os from 'os';
import prompts from 'prompts';
import semver from 'semver';
import semverUtils from 'semver-utils';

import { fixCWD } from './cwd.mjs';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.mjs';
import {
  formatVersionTagForPackage,
  getAllFilesChangedSinceTagInfos,
  getLastKnownPublishTagInfoForAllPackages,
  gitCommit,
  gitConventionalForAllPackages,
  gitPush,
  gitTag,
  gitWorkdirUnclean,
} from './git.mjs';
import { conventionalCommitToBumpType } from './parser.mjs';
import { BumpRecommendation, BumpType, BumpTypeToString, PackageInfo } from './types.mjs';

/**
 * Returns all detected packages for this repository
 *
 * @param {string} [cwd=appRootPath.toString()]
 * @returns {Promise<PackageInfo[]>}
 */
export async function listPackages(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  return filterPackagesByNames(await getPackages(fixedCWD), undefined, fixedCWD);
}

/**
 * Given an optional array of package names, reads the latest
 * git tag that was used in a previous version bump operation.
 *
 * @param {string[]} [names]
 * @param {boolean} [noFetchTags=false]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<PublishTagInfo[]>}
 */
export async function getLastVersionTagsByPackageName(names, noFetchTags = false, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  return getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);
}

/**
 * Gets a list of all files that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 *
 * @param {string[]} [names]
 * @param {boolean} [noFetchTags=false]
 * @param {string} [cwd=appRootPath.toString()]
 * @returns {Promise<string[]>}
 */
export async function getChangedFilesSinceBump(names, noFetchTags = false, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);
  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  const tagResults = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);

  return getAllFilesChangedSinceTagInfos(tagResults, fixedCWD);
}

/**
 * Gets a list of all packages that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 * @param {string[]} [names]
 * @param {boolean} [noFetchTags]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<PackageInfo[]>}
 */
export async function getChangedPackagesSinceBump(names, noFetchTags = false, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  const tagInfos = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);
  const changedFiles = await getAllFilesChangedSinceTagInfos(tagInfos, fixedCWD);

  return getAllPackagesChangedBasedOnFilesModified(changedFiles, filteredPackages, fixedCWD);
}

/**
 * Parses commits since last publish for a specific package or set of packages
 * and returns them represented as Conventional Commits objects.
 *
 * @param {string[]} [names]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function getConventionalCommitsByPackage(names, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

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
 * @param {string} [preid]
 * @param {boolean} [forceAll=false]
 * @param {boolean} [noFetchTags=false]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<BumpRecommendation[]>}
 */
export async function getRecommendedBumpsByPackage(
  names,
  preid,
  forceAll = false,
  noFetchTags = false,
  cwd = appRootPath.toString(),
) {
  // args.package, args.preid, args.forceAll, args.noFetchTags, args.cwd
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  const filteredPackagesByName = new Map(filteredPackages.map(p => [p.name, p]));

  const conventional = await gitConventionalForAllPackages(filteredPackages, fixedCWD);
  const tagsForPackagesMap = new Map(
    (await getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD)).map(t => [
      t.packageName,
      t,
    ]),
  );

  // we need to gather the commit types per-package, then pick the "greatest" or "most disruptive" one
  // as the one that will determine the bump to be applied
  /** @type {Map<string, BumpType>} */
  const bumpTypeByPackageName = new Map();

  for (const commit of conventional) {
    const bumpType = Math.max(
      bumpTypeByPackageName.get(commit.packageInfo.name) ?? BumpType.PATCH,
      preid ? BumpType.PRERELEASE : conventionalCommitToBumpType(commit),
    );
    bumpTypeByPackageName.set(commit.packageInfo.name, bumpType);
  }

  if (forceAll) {
    // loop over all packages and set any packages that don't
    // already have an entry to a PATCH
    for (const packageInfo of filteredPackages) {
      if (bumpTypeByPackageName.has(packageInfo.name)) continue;

      bumpTypeByPackageName.set(packageInfo.name, BumpType.PATCH);
    }
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
      preid ? 'prerelease' : bumpType === BumpType.PATCH ? 'patch' : bumpType === BumpType.MINOR ? 'minor' : 'major',
      undefined,
      preid,
    );

    // preids take precedence above all
    const from = forceAll ? packageInfo.version : preid || tagInfo?.sha ? packageInfo.version : null;
    out.push(new BumpRecommendation(packageInfo, from, (Boolean(from) && newBump) || packageInfo.version, bumpType));
  }

  return out;
}

/**
 * Given an optional list of package names, parses the git history
 * since the last bump operation, suggest a bump and applies it, also
 * updating any dependent package.json files across your repository.
 *
 * NOTE: It is possible for your bump recommendation to not change.
 * If this is the case, this means that your particular package has never had a version bump by the lets-version library.
 *
 * @param {string[]} [names]
 * @param {string} [preid]
 * @param {boolean} [forceAll=false]
 * @param {boolean} [noFetchTags=false]
 * @param {object} [opts]
 * @param {boolean} [opts.yes=false] - If true, skips all user confirmations
 * @param {boolean} [opts.updatePeer=false] - If true, will update any dependent "package.json#peerDependencies" fields
 * @param {boolean} [opts.updateOptional=false] - If true, will update any dependent "package.json#optionalDependencies" fields
 * @param {boolean} [opts.noPush=false] - If true, will prevent pushing any changes to upstream / origin
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function applyRecommendedBumpsByPackage(
  names,
  preid,
  forceAll = false,
  noFetchTags = false,
  opts,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);

  let yes = opts?.yes || false;
  const updatePeer = opts?.updatePeer || false;
  const updateOptional = opts?.updateOptional || false;
  const noPush = opts?.noPush || false;

  const workingDirUnclean = await gitWorkdirUnclean(fixedCWD);

  if (workingDirUnclean) {
    console.warn('Unable to apply version bumps because', fixedCWD, 'has uncommitted changes');
    return [];
  }

  const allPackages = await getPackages(fixedCWD);

  if (!allPackages.length) return [];

  const bumps = await getRecommendedBumpsByPackage(names, preid, forceAll, noFetchTags, fixedCWD);
  const bumpsByPackageName = new Map(bumps.map(b => [b.packageInfo.name, b]));

  if (!bumps.length) {
    console.warn('Unable to apply version bumps because no packages need bumping.');
    return [];
  }

  if (!yes) {
    const message = bumps
      .map(
        b =>
          `package: ${b.packageInfo.name}${os.EOL}  bump: ${b.from ? `${b.from} -> ${b.to}` : `First time -> ${b.to}`}${
            os.EOL
          }  type: ${BumpTypeToString[b.type]}${os.EOL}  valid: ${b.isValid}`,
      )
      .join(`${os.EOL}${os.EOL}`);
    const response = await prompts([
      {
        message: `The following bumps will be applied:${os.EOL}${os.EOL}${message}${os.EOL}${os.EOL}Do you want to continue?`,
        name: 'yes',
        type: 'confirm',
      },
    ]);
    yes = response.yes;
  }

  if (!yes) return console.warn('User did not confirm changes. Aborting now.');

  await Promise.all(
    bumps.map(async b => {
      // need to read each package.json file, handle the updates, then write the file back
      b.packageInfo.pkg.version = b.to;

      // updated the package that needed the bump
      await fs.writeFile(b.packageInfo.packageJSONPath, JSON.stringify(b.packageInfo.pkg, null, 2), 'utf-8');

      // now we need to loop over EVERY package detected in the repo
      for (const packageInfo of allPackages) {
        if (packageInfo.name === b.packageInfo.name) continue;

        for (const key in packageInfo.pkg) {
          const lowerKey = key.toLowerCase();
          if (!lowerKey.includes('dependencies')) continue;
          switch (key) {
            case 'dependencies':
            case 'devDependencies':
            case 'peerDependencies':
            case 'optionalDependencies': {
              const canUpdate =
                (key === 'optionalDependencies' && updateOptional) ||
                (key === 'peerDependencies' && updatePeer) ||
                (key !== 'optionalDependencies' && key !== 'peerDependencies');

              if (!canUpdate || !packageInfo.pkg[key]?.[b.packageInfo.name]) continue;

              // we literally just checked for nullability above, so let's force TSC to ignore
              // @ts-ignore
              const existingSemverStr = packageInfo.pkg[key][b.packageInfo.name] || '';
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

              // IF there's no from, this is the very first lets-version controlled commit operations
              if (!b.from) continue;
              const newSemverStr = `${firstDetailOperator}${b.to}`;

              // @ts-ignore
              packageInfo.pkg[key][b.packageInfo.name] = newSemverStr;
              await fs.writeFile(
                packageInfo.packageJSONPath,
                JSON.stringify({ ...packageInfo.pkg, version: bumpsByPackageName.get(packageInfo.name)?.to }, null, 2),
                'utf-8',
              );
              break;
            }
            default:
              console.warn(`Updating ${key} is not currently supported by the lets-version library`);
              break;
          }
        }
      }
    }),
  );

  // install deps to ensure lockfiles are updated
  const pm = await detectPM({ cwd: fixedCWD });
  await execaCommand(`${pm} install`, { cwd: fixedCWD, stdio: 'inherit' });

  // commit the stuffs
  await gitCommit('Version Bump', bumps.map(b => `${b.packageInfo.name}@${b.to}`).join(os.EOL), '', fixedCWD);

  // create all the git tags
  await Promise.all(
    bumps.map(async b =>
      gitTag(
        formatVersionTagForPackage(
          new PackageInfo({
            ...b.packageInfo,
            version: b.to,
          }),
        ),
        fixedCWD,
      ),
    ),
  );

  // push to upstream
  if (!noPush) await gitPush(fixedCWD);
}
