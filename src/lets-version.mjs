/**
 * @typedef {import('./types.mjs').GitCommitWithConventional} GitCommitWithConventional
 * @typedef {import('./types.mjs').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.mjs').PublishTagInfo} PublishTagInfo
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('./changelog.mjs').GenerateChangelogOpts} GenerateChangelogOpts
 */

import appRootPath from 'app-root-path';
import { detect as detectPM } from 'detect-package-manager';
import { execaCommand } from 'execa';
import fs from 'fs-extra';
import os from 'os';
import prompts from 'prompts';

import { getChangelogUpdateForPackageInfo, getFormattedChangelogDate } from './changelog.mjs';
import { fixCWD } from './cwd.mjs';
import { getBumpRecommendationForPackageInfo, synchronizeBumps } from './dependencies.mjs';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.mjs';
import {
  formatVersionTagForPackage,
  getAllFilesChangedSinceTagInfos,
  getLastKnownPublishTagInfoForAllPackages,
  gitCommit,
  gitConventionalForAllPackages,
  gitPush,
  gitPushTag,
  gitTag,
  gitWorkdirUnclean,
} from './git.mjs';
import { conventionalCommitToBumpType } from './parser.mjs';
import {
  BumpType,
  BumpTypeToString,
  ChangelogEntryType,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  GitConventional,
  PackageInfo,
} from './types.mjs';

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
 * @returns {Promise<GenerateChangelogOpts>}
 */
export async function getRecommendedBumpsByPackage(
  names,
  preid,
  forceAll = false,
  noFetchTags = false,
  cwd = appRootPath.toString(),
) {
  /**
   * @type {GenerateChangelogOpts}
   */
  const out = {
    bumps: [],
    conventional: [],
  };

  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return out;

  const filteredPackagesByName = new Map(filteredPackages.map(p => [p.name, p]));

  const conventional = await gitConventionalForAllPackages(filteredPackages, fixedCWD);
  out.conventional = conventional;

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

  for (const [packageName, bumpType] of bumpTypeByPackageName.entries()) {
    const packageInfo = filteredPackagesByName.get(packageName);
    if (!packageInfo) {
      throw new Error(`No package info for ${packageName} was loaded in memory. Unable to get recommended bump.`);
    }
    const tagInfo = tagsForPackagesMap.get(packageName);

    // preids take precedence above all
    const from = forceAll ? packageInfo.version : preid || tagInfo?.sha ? packageInfo.version : null;

    out.bumps.push(getBumpRecommendationForPackageInfo(packageInfo, from, bumpType, preid));
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
 * @param {boolean} [opts.noChangelog=false] - If true, will not write CHANGELOG.md updates for each package that has changed
 * @param {boolean} [opts.dryRun=false] - If true, will print the changes that are expected to happen at every step instead of actually writing the changes
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
  const noChangelog = opts?.noChangelog || false;
  const dryRun = opts?.dryRun || false;

  if (dryRun) console.warn('**Dry Run has been enabled**');

  const workingDirUnclean = await gitWorkdirUnclean(fixedCWD);

  if (workingDirUnclean) {
    console.warn('Unable to apply version bumps because', fixedCWD, 'has uncommitted changes');
    return [];
  }

  const allPackages = await getPackages(fixedCWD);

  if (!allPackages.length) return [];

  const recommendedBumpsInfo = await getRecommendedBumpsByPackage(names, preid, forceAll, noFetchTags, fixedCWD);
  const { bumps: presyncBumps } = recommendedBumpsInfo;

  const presyncBumpsByPackageName = new Map(presyncBumps.map(b => [b.packageInfo.name, b]));

  if (!presyncBumps.length) {
    console.warn('Unable to apply version bumps because no packages need bumping.');
    return [];
  }

  const synchronized = synchronizeBumps(
    presyncBumps,
    presyncBumpsByPackageName,
    allPackages,
    preid,
    updatePeer,
    updateOptional,
  );

  let requireUserConfirmation = false;

  const message = synchronized.bumps
    .map(
      b =>
        `package: ${b.packageInfo.name}${os.EOL}  bump: ${b.from ? `${b.from} -> ${b.to}` : `First time -> ${b.to}`}${
          os.EOL
        }  type: ${BumpTypeToString[b.type]}${os.EOL}  valid: ${b.isValid}`,
    )
    .join(`${os.EOL}${os.EOL}`);
  if (!yes) {
    requireUserConfirmation = true;
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

  // don't want to print the operations message twice, so we track whether a user needed to confirm something
  if (!requireUserConfirmation) console.info(`Will perform the following updates:${os.EOL}${os.EOL}${message}`);

  // await Promise.all(
  //   bumps.map(async b => {
  //     // need to read each package.json file, handle the updates, then write the file back
  //     b.packageInfo.pkg.version = b.to;

  //     // updated the package that needed the bump
  //     if (dryRun) console.info(`Will update the "version" field in ${b.packageInfo.packageJSONPath} to ${b.to}`);
  //     else await fs.writeFile(b.packageInfo.packageJSONPath, JSON.stringify(b.packageInfo.pkg, null, 2), 'utf-8');

  //     // now we need to loop over EVERY package detected in the repo
  //     for (const packageInfo of allPackages) {
  //       if (packageInfo.name === b.packageInfo.name) continue;

  //       for (const key in packageInfo.pkg) {
  //         if (!isPackageJSONDependencyKeySupported(key, updatePeer, updateOptional)) continue;

  //         // @ts-ignore
  //         if (!packageInfo.pkg[key]?.[b.packageInfo.name]) continue;

  //         // we literally just checked for nullability above, so let's force TSC to ignore
  //         // @ts-ignore
  //         const existingSemverStr = packageInfo.pkg[key][b.packageInfo.name] || '';
  //         const semverDetails = semverUtils.parseRange(existingSemverStr);
  //         // if there are more than one semverDetails because user has a complicated range,
  //         // we will only take the first one if it's something we can work with in the update.
  //         // if it's not something reasonable, it will automatically become "^"
  //         const [firstDetail] = semverDetails;
  //         let firstDetailOperator = firstDetail?.operator || '^';
  //         if (
  //           !firstDetailOperator.startsWith('>=') &&
  //           !firstDetailOperator.startsWith('^') &&
  //           !firstDetailOperator.startsWith('~')
  //         ) {
  //           firstDetailOperator = '^';
  //         }

  //         // IF there's no from, this is the very first lets-version controlled commit operations
  //         if (!b.from) continue;
  //         const newSemverStr = `${firstDetailOperator}${b.to}`;

  //         // @ts-ignore
  //         packageInfo.pkg[key][b.packageInfo.name] = newSemverStr;

  //         // If the dependent package had an update prior, we need to take the new version update or
  //         // keep the existing (this is the top-level "version" field for the package, not a "dependencies")
  //         const version = bumpsByPackageName.get(packageInfo.name)?.to ?? packageInfo.version;

  //         // okay, there might now be a version update we need to apply

  //         if (dryRun) {
  //           console.info(
  //             `Will update ${packageInfo.packageJSONPath} because found that "${b.packageInfo.name}" in "${key}" needs to be set to "${newSemverStr}"`,
  //           );
  //         } else {
  //           await fs.writeFile(
  //             packageInfo.packageJSONPath,
  //             JSON.stringify({ ...packageInfo.pkg, version }, null, 2),
  //             'utf-8',
  //           );
  //         }
  //         break;
  //       }
  //     }
  //   }),
  // );

  // install deps to ensure lockfiles are updated
  const pm = await detectPM({ cwd: fixedCWD });

  if (dryRun) console.info(`Will run ${pm} install to synchronize lockfiles`);
  else await execaCommand(`${pm} install`, { cwd: fixedCWD, stdio: 'inherit' });

  // generate changelogs
  if (!noChangelog) {
    // there may be packages that now need to have changelogs updated
    // because they're being bumped as the result of dep tree updates.
    // we need to apply some additional changelogs if that's the casue
    const changelogInfo = await getChangelogUpdateForPackageInfo({
      ...recommendedBumpsInfo,
      bumps: synchronized.bumps,
    });

    for (const syncbump of synchronized.bumps) {
      if (presyncBumpsByPackageName.has(syncbump.packageInfo.name)) continue;

      changelogInfo.push(
        new ChangelogUpdate(getFormattedChangelogDate(), syncbump, {
          [ChangelogEntryType.MISC]: new ChangelogUpdateEntry(ChangelogEntryType.MISC, [
            new GitConventional({
              body: null,
              breaking: syncbump.type === BumpType.MAJOR,
              footer: null,
              header: 'Version bump due to parent version bump',
              mentions: null,
              merge: null,
              notes: [],
              sha: '',
            }),
          ]),
        }),
      );
    }

    // actually write the changelogs
    await Promise.all(
      changelogInfo.map(async c => {
        let existingChangelog = '';
        await fs.ensureFile(c.changelogPath);

        try {
          existingChangelog = await fs.readFile(c.changelogPath, 'utf-8');
        } catch (error) {
          /* file doesn't exist */
        }
        const changelogUpdates = `${c.toString()}---`;

        if (dryRun) {
          console.info(
            `Will write the following changelog update to ${c.changelogPath}:${os.EOL}${os.EOL}${changelogUpdates}`,
          );
        } else await fs.writeFile(c.changelogPath, `${changelogUpdates}${existingChangelog}`, 'utf-8');
      }),
    );
  }

  // commit the stuffs
  const header = 'Version Bump';
  const body = synchronized.bumps.map(b => `${b.packageInfo.name}@${b.to}`).join(os.EOL);
  if (dryRun) {
    console.info(
      `~~~~~${os.EOL}Will create a git commit with the following message:${os.EOL}${os.EOL}${header}${os.EOL}${os.EOL}${body}${os.EOL}~~~~~`,
    );
  } else await gitCommit(header, body, '', fixedCWD);

  // create all the git tags
  const tagsToPush = await Promise.all(
    synchronized.bumps.map(async b => {
      const tag = formatVersionTagForPackage(
        new PackageInfo({
          ...b.packageInfo,
          version: b.to,
        }),
      );
      if (dryRun) console.info(`Will create the following git tag: ${tag}`);
      else await gitTag(tag);

      return tag;
    }, fixedCWD),
  );

  // push to upstream
  if (!noPush) {
    if (dryRun) console.info(`Will git push --no-verify all changes made during the version bump operation`);
    else await gitPush(fixedCWD);

    for (const tagToPush of tagsToPush) {
      // push a single tag at a time
      if (dryRun) console.info(`Will push single git tag "${tagToPush}" to origin`);
      else await gitPushTag(tagToPush, fixedCWD);
    }
  }
}
