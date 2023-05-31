/**
 * @typedef {import('./types.js').GitCommitWithConventional} GitCommitWithConventional
 * @typedef {import('./types.js').BumpRecommendation} BumpRecommendation
 * @typedef {import('./types.js').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.js').PublishTagInfo} PublishTagInfo
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('./changelog.js').GenerateChangelogOpts} GenerateChangelogOpts
 * @typedef {import('./dependencies.js').SynchronizeBumpsReturnType} SynchronizeBumpsReturnType
 */

import appRootPath from 'app-root-path';
import { detect as detectPM } from 'detect-package-manager';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import prompts from 'prompts';
import semver from 'semver';

import { getChangelogUpdateForPackageInfo, getFormattedChangelogDate } from './changelog.js';
import { upsertChangeset } from './changeset.js';
import { fixCWD } from './cwd.js';
import { getBumpRecommendationForPackageInfo, synchronizeBumps } from './dependencies.js';
import { execAsync } from './exec.js';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.js';
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
} from './git.js';
import { conventionalCommitToBumpType } from './parser.js';
import {
  BumpType,
  BumpTypeToString,
  ChangelogEntryType,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  GitConventional,
  PackageInfo,
  ReleaseAsPresets,
} from './types.js';

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
 * @param {boolean} [noFetchAll=false]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function getConventionalCommitsByPackage(names, noFetchAll = false, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages.length) return [];

  return gitConventionalForAllPackages(filteredPackages, noFetchAll, fixedCWD);
}

/**
 * @typedef {Object} GetRecommendedBumpsByPackageReturnType
 * @property {BumpRecommendation[]} bumps
 * @property {Map<string, BumpRecommendation>} bumpsByPackageName
 * @property {PackageInfo[]} packages
 * @property {GitCommitWithConventionalAndPackageInfo[]} conventional
 */

/**
 * Given an optional list of package names, parses the git history
 * since the last bump operation and suggests a bump.
 *
 * NOTE: It is possible for your bump recommendation to not change.
 * If this is the case, this means that your particular package has never had a version bump by the lets-version library.
 *
 * @param {string[]} [names]
 * @param {ReleaseAsPresets} [releaseAs='auto']
 * @param {string} [preid='']
 * @param {boolean} [forceAll=false]
 * @param {boolean} [noFetchAll=false]
 * @param {boolean} [noFetchTags=false]
 * @param {boolean} [updatePeer=false]
 * @param {boolean} [updateOptional=false]
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GetRecommendedBumpsByPackageReturnType>}
 */
export async function getRecommendedBumpsByPackage(
  names,
  releaseAs = ReleaseAsPresets.AUTO,
  preid = '',
  forceAll = false,
  noFetchAll = false,
  noFetchTags = false,
  updatePeer = false,
  updateOptional = false,
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

  const allPackages = await getPackages(fixedCWD);
  const filteredPackages = await filterPackagesByNames(allPackages, names, fixedCWD);

  if (!filteredPackages) return { bumps: [], bumpsByPackageName: new Map(), conventional: [], packages: [] };

  const filteredPackagesByName = new Map(filteredPackages.map(p => [p.name, p]));

  const conventional = await gitConventionalForAllPackages(filteredPackages, noFetchAll, fixedCWD);
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

  if (preid && releaseAs) {
    console.warn('Both preid and releaseAs were set. preid takes precedence');
  }
  const isExactRelease = Boolean(semver.coerce(releaseAs));

  if (!isExactRelease) {
    for (const commit of conventional) {
      // this is the "AUTO" setting, by default, and also the "preid" case
      let bumpType = Math.max(
        bumpTypeByPackageName.get(commit.packageInfo.name) ?? BumpType.PATCH,
        preid ? BumpType.PRERELEASE : conventionalCommitToBumpType(commit),
      );

      if (!preid) {
        switch (releaseAs) {
          case ReleaseAsPresets.ALPHA:
            bumpType = BumpType.PRERELEASE;
            preid = 'alpha';
            break;
          case ReleaseAsPresets.AUTO:
            /* no-op */
            break;
          case ReleaseAsPresets.BETA:
            bumpType = BumpType.PRERELEASE;
            preid = 'beta';
            break;
          case ReleaseAsPresets.MAJOR:
            bumpType = BumpType.MAJOR;
            break;
          case ReleaseAsPresets.MINOR:
            bumpType = BumpType.MINOR;
            break;
          case ReleaseAsPresets.PATCH:
            bumpType = BumpType.PATCH;
            break;
          default:
            throw new Error(
              `Unable to getRecommendedBumpsByPackage because an invalid releaseAs of "${releaseAs}" was provided`,
            );
        }
      }

      bumpTypeByPackageName.set(commit.packageInfo.name, bumpType);
    }
  }

  if (forceAll || isExactRelease) {
    // loop over all packages and set any packages that don't
    // already have an entry to a PATCH
    for (const packageInfo of filteredPackages) {
      if (isExactRelease) {
        bumpTypeByPackageName.set(packageInfo.name, BumpType.EXACT);
        continue;
      }

      if (bumpTypeByPackageName.has(packageInfo.name)) continue;

      let forcedBumpType = BumpType.PATCH;
      switch (releaseAs) {
        case ReleaseAsPresets.ALPHA:
        case ReleaseAsPresets.BETA:
          forcedBumpType = BumpType.PRERELEASE;
          break;
        case ReleaseAsPresets.MAJOR:
          forcedBumpType = BumpType.MAJOR;
          break;
        case ReleaseAsPresets.MINOR:
          forcedBumpType = BumpType.MINOR;
          break;
        case ReleaseAsPresets.PATCH:
          forcedBumpType = BumpType.PATCH;
          break;
        default:
          break;
      }

      bumpTypeByPackageName.set(packageInfo.name, forcedBumpType);
    }
  }

  for (const [packageName, bumpType] of bumpTypeByPackageName.entries()) {
    const packageInfo = filteredPackagesByName.get(packageName);
    if (!packageInfo) {
      throw new Error(`No package info for ${packageName} was loaded in memory. Unable to get recommended bump.`);
    }
    const tagInfo = tagsForPackagesMap.get(packageName);

    // preids take precedence above all
    const from = forceAll || preid || isExactRelease || tagInfo?.sha ? packageInfo.version : null;

    out.bumps.push(getBumpRecommendationForPackageInfo(packageInfo, from, bumpType, releaseAs, preid));
  }

  const synchronized = synchronizeBumps(
    out.bumps,
    new Map(out.bumps.map(b => [b.packageInfo.name, b])),
    allPackages,
    releaseAs,
    preid,
    updatePeer,
    updateOptional,
  );

  return { ...synchronized, conventional };
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
 * @param {ReleaseAsPresets} [releaseAs='auto']
 * @param {string} [preid='']
 * @param {boolean} [forceAll=false]
 * @param {boolean} [noFetchAll=false]
 * @param {boolean} [noFetchTags=false]
 * @param {object} [opts]
 * @param {boolean} [opts.yes=false] - If true, skips all user confirmations
 * @param {boolean} [opts.updatePeer=false] - If true, will update any dependent "package.json#peerDependencies" fields
 * @param {boolean} [opts.updateOptional=false] - If true, will update any dependent "package.json#optionalDependencies" fields
 * @param {boolean} [opts.noPush=false] - If true, will prevent pushing any changes to upstream / origin
 * @param {boolean} [opts.noChangelog=false] - If true, will not write CHANGELOG.md updates for each package that has changed
 * @param {boolean} [opts.dryRun=false] - If true, will print the changes that are expected to happen at every step instead of actually writing the changes
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GetRecommendedBumpsByPackageReturnType | null>}
 */
export async function applyRecommendedBumpsByPackage(
  names,
  releaseAs = ReleaseAsPresets.AUTO,
  preid = '',
  forceAll = false,
  noFetchAll = false,
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
    return null;
  }

  const allPackages = await getPackages(fixedCWD);

  if (!allPackages.length) return null;

  const synchronized = await getRecommendedBumpsByPackage(
    names,
    releaseAs,
    preid,
    forceAll,
    noFetchAll,
    noFetchTags,
    updatePeer,
    updateOptional,
    fixedCWD,
  );
  const { bumpsByPackageName: presyncBumpsByPackageName } = synchronized;

  if (!synchronized.bumps.length) {
    console.warn('Unable to apply version bumps because no packages need bumping.');
    return null;
  }

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

  if (!yes) {
    console.warn('User did not confirm changes. Aborting now.');
    return null;
  }

  // don't want to print the operations message twice, so we track whether a user needed to confirm something
  if (!requireUserConfirmation) console.info(`Will perform the following updates:${os.EOL}${os.EOL}${message}`);

  // flush package.json updates out to disk
  await Promise.all(
    synchronized.bumps.map(async b => {
      if (dryRun) {
        console.info(`Will write package.json updates for ${b.packageInfo.name} to ${b.packageInfo.packageJSONPath}`);
      } else fs.writeFile(b.packageInfo.packageJSONPath, JSON.stringify(b.packageInfo.pkg, null, 2), 'utf-8');
    }),
  );

  // install deps to ensure lockfiles are updated
  const pm = await detectPM({ cwd: fixedCWD });

  if (dryRun) console.info(`Will run ${pm} install to synchronize lockfiles`);
  else {
    /**
     * As of 5/30/2023, there is an open bug with NPM that causes "npm ci" to fail
     * due to some internal race condition where lockfiles need a subsequent
     * npm install to flush out all the changes.
     * https://github.com/npm/cli/issues/4859#issuecomment-1120018666
     * and
     * https://github.com/npm/cli/issues/4942
     */
    const syncLockfiles = () => execAsync(`${pm} install`, { cwd: fixedCWD, stdio: 'inherit' });
    await syncLockfiles();
    await syncLockfiles();
  }

  // generate changelogs
  if (!noChangelog) {
    // there may be packages that now need to have changelogs updated
    // because they're being bumped as the result of dep tree updates.
    // we need to apply some additional changelogs if that's the casue
    const changelogInfo = await getChangelogUpdateForPackageInfo({
      conventional: synchronized.conventional,
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
        const changelogDir = path.dirname(c.changelogPath);

        await fs.ensureDir(changelogDir);

        try {
          existingChangelog = await fs.readFile(c.changelogPath, 'utf-8');
        } catch (error) {
          /* file doesn't exist */
        }
        const changelogUpdates = `${c.toString()}${os.EOL}---${os.EOL}${os.EOL}`;

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
      else await gitTag(tag, fixedCWD);

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

  return synchronized;
}

/**
 * Runs the changeset post-commit hook
 *
 * @param {string} filePath
 * @param {boolean} compress
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function postCommit(filePath, compress, cwd = appRootPath.toString()) {
  return upsertChangeset(filePath, compress, fixCWD(cwd));
}
