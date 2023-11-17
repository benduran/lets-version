/**
 * @typedef {import('./types.js').GitCommitWithConventional} GitCommitWithConventional
 * @typedef {import('./types.js').BumpRecommendation} BumpRecommendation
 * @typedef {import('./types.js').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.js').PublishTagInfo} PublishTagInfo
 * @typedef {import('./types.js').ChangeLogLineFormatter} ChangeLogLineFormatter
 * @typedef {import('./types.js').ChangeLogEntryFormatter} ChangeLogEntryFormatter
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('./changelog.js').GenerateChangelogOpts} GenerateChangelogOpts
 * @typedef {import('./dependencies.js').SynchronizeBumpsReturnType} SynchronizeBumpsReturnType
 * @typedef {import('./readUserConfig.js').LetsVersionConfig} LetsVersionConfig
 */

import appRootPath from 'app-root-path';
import { execSync } from 'child_process';
import { detect as detectPM } from 'detect-package-manager';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import prompts from 'prompts';
import semver from 'semver';

import { getChangelogUpdateForPackageInfo, getFormattedChangelogDate } from './changelog.js';
import { fixCWD } from './cwd.js';
import { getBumpRecommendationForPackageInfo, synchronizeBumps } from './dependencies.js';
import { filterPackagesByNames, getAllPackagesChangedBasedOnFilesModified, getPackages } from './getPackages.js';
import {
  formatVersionTagForPackage,
  getAllFilesChangedSinceBranch,
  getAllFilesChangedSinceTagInfos,
  getLastKnownPublishTagInfoForAllPackages,
  gitCommit,
  gitConventionalForAllPackages,
  gitPush,
  gitPushTags,
  gitTag,
  gitWorkdirUnclean,
} from './git.js';
import { buildLocalDependencyGraph } from './localDependencyGraph.js';
import { conventionalCommitToBumpType } from './parser.js';
import { defineLetsVersionConfig, readLetsVersionConfig } from './readUserConfig.js';
import {
  BumpType,
  BumpTypeToString,
  ChangelogAggregateUpdate,
  ChangelogEntryType,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  GitConventional,
  PackageInfo,
  ReleaseAsPresets,
} from './types.js';

export { defineLetsVersionConfig };

/**
 * @typedef {Object} AllCommandsBaseOpts
 * @property {string} [cwd=appRootPath.toString()]
 */

/**
 * Returns all detected packages for this repository
 *
 * @param {AllCommandsBaseOpts} [opts]
 * @returns {Promise<PackageInfo[]>}
 */
export async function listPackages(opts) {
  const fixedCWD = fixCWD(opts?.cwd || appRootPath.toString());

  return filterPackagesByNames(await getPackages(fixedCWD), undefined, fixedCWD);
}

/**
 * @typedef {Object} GetLastVersionTagsByPackageNameOpts
 * @property {string} [cwd=appRootPath.toString()]
 * @property {string[]} [names]
 * @property {boolean} [noFetchTags=false]
 */

/**
 * Given an optional array of package names, reads the latest
 * git tag that was used in a previous version bump operation.
 *
 * @param {GetLastVersionTagsByPackageNameOpts} [opts]
 *
 * @returns {Promise<PublishTagInfo[]>}
 */
export async function getLastVersionTagsByPackageName(opts) {
  const { names, noFetchTags = false, cwd = appRootPath.toString() } = opts ?? {};
  const fixedCWD = fixCWD(cwd);

  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  return getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);
}

/**
 * Gets a list of all files that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 *
 * @param {GetLastVersionTagsByPackageNameOpts} [opts]
 * @returns {Promise<string[]>}
 */
export async function getChangedFilesSinceBump(opts) {
  const { names, noFetchTags = false, cwd = appRootPath.toString() } = opts ?? {};
  const fixedCWD = fixCWD(cwd);
  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  const tagResults = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);

  return getAllFilesChangedSinceTagInfos(filteredPackages, tagResults, fixedCWD);
}

/**
 * @typedef {Object} GetChangedFilesSinceBranchOpts
 * @property {string} [cwd=appRootPath.toString()]
 * @property {string[]} [names]
 * @property {string} [branch='main']
 */

/**
 * Gets a list of all files that have changed since the current branch was created.
 *
 * @param {GetChangedFilesSinceBranchOpts} [opts]
 * @returns {Promise<string[]>}
 */
export async function getChangedFilesSinceBranch(opts) {
  const { names, cwd = appRootPath.toString(), branch = 'main' } = opts ?? {};
  const fixedCWD = fixCWD(cwd);
  const filteredPackages = await filterPackagesByNames(await getPackages(fixedCWD), names, fixedCWD);

  if (!filteredPackages) return [];

  return getAllFilesChangedSinceBranch(filteredPackages, branch, fixedCWD);
}

/**
 * Gets a list of all packages that have changed since the last publish for a specific package or set of packages.
 * If no results are returned, it likely means that there was not a previous version tag detected in git.
 *
 * @param {GetLastVersionTagsByPackageNameOpts} [opts]
 *
 * @returns {Promise<PackageInfo[]>}
 */
export async function getChangedPackagesSinceBump(opts) {
  const { names, noFetchTags = false, cwd = appRootPath.toString() } = opts ?? {};
  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const rootPackage = allPackages.find(p => p.root);
  const filteredPackages = await filterPackagesByNames(allPackages, names, fixedCWD);

  if (!filteredPackages) return [];

  const tagInfos = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, noFetchTags, fixedCWD);
  const changedFiles = await getAllFilesChangedSinceTagInfos(filteredPackages, tagInfos, fixedCWD);

  /** @type {PackageInfo[]} */
  const allPackagesFilteredPlusRoot = [...filteredPackages];
  if (rootPackage) allPackagesFilteredPlusRoot.push(rootPackage);

  const deduped = Array.from(new Map(allPackagesFilteredPlusRoot.map(p => [p.name, p])).values());

  return getAllPackagesChangedBasedOnFilesModified(changedFiles, deduped, fixedCWD);
}

/**
 * Gets a list of all packages that have changed since the current branch was created.
 *
 * @param {GetChangedFilesSinceBranchOpts} [opts]
 *
 * @returns {Promise<PackageInfo[]>}
 */
export async function getChangedPackagesSinceBranch(opts) {
  const { names, cwd = appRootPath.toString(), branch = 'main' } = opts ?? {};
  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const rootPackage = allPackages.find(p => p.root);
  const filteredPackages = await filterPackagesByNames(allPackages, names, fixedCWD);

  if (!filteredPackages) return [];

  const changedFiles = await getAllFilesChangedSinceBranch(filteredPackages, branch, fixedCWD);

  /** @type {PackageInfo[]} */
  const allPackagesFilteredPlusRoot = [...filteredPackages];
  if (rootPackage) allPackagesFilteredPlusRoot.push(rootPackage);

  const deduped = Array.from(new Map(allPackagesFilteredPlusRoot.map(p => [p.name, p])).values());

  return getAllPackagesChangedBasedOnFilesModified(changedFiles, deduped, fixedCWD);
}

/**
 * @typedef {Object} GetConventionalCommitsByPackageOpts
 * @property {string} [cwd=appRootPath.toString()]
 * @property {string[]} [names]
 * @property {boolean} [noFetchTags=false]
 * @property {boolean} [noFetchAll=false]
 */

/**
 * Parses commits since last publish for a specific package or set of packages
 * and returns them represented as Conventional Commits objects.
 *
 * @param {GetConventionalCommitsByPackageOpts} [opts]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function getConventionalCommitsByPackage(opts) {
  const { names, noFetchAll = false, cwd = appRootPath.toString() } = opts ?? {};
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
 * @typedef {Object} GetRecommendedBumpsByPackageOpts
 * @property {string[]} [names]
 * @property {ReleaseAsPresets} [releaseAs='auto']
 * @property {string} [preid='']
 * @property {boolean} [uniqify=false]
 * @property {boolean} [forceAll=false]
 * @property {boolean} [noFetchAll=false]
 * @property {boolean} [noFetchTags=false]
 * @property {boolean} [updatePeer=false]
 * @property {boolean} [updateOptional=false]
 * @property {string} [cwd=appRootPath.toString()]
 */

/**
 * Given an optional list of package names, parses the git history
 * since the last bump operation and suggests a bump.
 *
 * NOTE: It is possible for your bump recommendation to not change.
 * If this is the case, this means that your particular package has never had a version bump by the lets-version library.
 *
 * @param {GetRecommendedBumpsByPackageOpts} [opts]
 *
 * @returns {Promise<GetRecommendedBumpsByPackageReturnType>}
 */
export async function getRecommendedBumpsByPackage(opts) {
  const {
    names,
    releaseAs = ReleaseAsPresets.AUTO,
    uniqify = false,
    forceAll = false,
    noFetchAll = false,
    noFetchTags = false,
    updatePeer = false,
    updateOptional = false,
    cwd = appRootPath.toString(),
  } = opts ?? {};

  let preid = opts?.preid || '';

  /**
   * @type {GenerateChangelogOpts}
   */
  const out = {
    bumps: [],
    commits: [],
  };

  const fixedCWD = fixCWD(cwd);

  const allPackages = await getPackages(fixedCWD);
  const filteredPackages = await filterPackagesByNames(allPackages, names, fixedCWD);

  if (!filteredPackages) return { bumps: [], bumpsByPackageName: new Map(), conventional: [], packages: [] };

  const filteredPackagesByName = new Map(filteredPackages.map(p => [p.name, p]));

  const conventional = await gitConventionalForAllPackages(filteredPackages, noFetchAll, fixedCWD);
  out.commits = conventional;

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

    out.bumps.push(
      await getBumpRecommendationForPackageInfo(
        packageInfo,
        from,
        bumpType,
        undefined,
        releaseAs,
        preid,
        uniqify,
        fixedCWD,
      ),
    );
  }

  const synchronized = await synchronizeBumps(
    out.bumps,
    new Map(out.bumps.map(b => [b.packageInfo.name, b])),
    allPackages,
    releaseAs,
    preid,
    uniqify,
    updatePeer,
    updateOptional,
    fixedCWD,
  );

  return { ...synchronized, conventional };
}

/**
 * @typedef {Object} ApplyRecommendedBumpsByPackageOpts
 * @property {string[]} [names]
 * @property {ReleaseAsPresets} [releaseAs='auto']
 * @property {string} [preid='']
 * @property {boolean} [uniqify=false]
 * @property {boolean} [forceAll=false]
 * @property {boolean} [noCommit=false] - If true, will modify all required files but leave them uncommitted after all operations have completed. This will also prevent a git push from occurring
 * @property {boolean} [noFetchAll=false]
 * @property {boolean} [noFetchTags=false]
 * @property {boolean} [noInstall=false] - If true, will skip running "npm install" or your package manager's equivalent install after applying the bumps
 * @property {boolean} [yes=false] - If true, skips all user confirmations
 * @property {boolean} [updatePeer=false] - If true, will update any dependent "package.json#peerDependencies" fields
 * @property {boolean} [updateOptional=false] - If true, will update any dependent "package.json#optionalDependencies" fields
 * @property {boolean} [noPush=false] - If true, will prevent pushing any changes to upstream / origin
 * @property {boolean} [rollupChangelog=false] - If true, in addition to updating changelog files for all packages that will be bumped, creates a "rollup" CHANGELOG.md at the root of the repo that contains an aggregate of changes
 * @property {boolean} [noChangelog=false] - If true, will not write CHANGELOG.md updates for each package that has changed
 * @property {boolean} [changelogDependencies=false] - If true, changelog will include information about the changes in the dependencies of a package that is being bumped
 * @property {boolean} [dryRun=false] - If true, will print the changes that are expected to happen at every step instead of actually writing the changes
 * @property {string} [cwd=appRootPath.toString()]
 * @property {boolean} [allowUncommitted=false] - If true, will allow the version operation to continue when there are uncommitted files in the repo at version bump time. This is usefull if you have some scripts that need to run after version bumps are performed, but potentially before you issue a git commit and subsequent npm publish operation.
 * @property {LetsVersionConfig} [customConfig]
 */

/**
 * Given an optional list of package names, parses the git history
 * since the last bump operation, suggest a bump and applies it, also
 * updating any dependent package.json files across your repository.
 *
 * NOTE: It is possible for your bump recommendation to not change.
 * If this is the case, this means that your particular package has never had a version bump by the lets-version library.
 *
 * @param {ApplyRecommendedBumpsByPackageOpts} [opts]
 *
 * @returns {Promise<GetRecommendedBumpsByPackageReturnType | null>}
 */
export async function applyRecommendedBumpsByPackage(opts) {
  const {
    allowUncommitted = false,
    customConfig: customConfigOverride,
    cwd = appRootPath.toString(),
    dryRun = false,
    forceAll = false,
    names,
    noChangelog = false,
    changelogDependencies = false,
    noCommit = false,
    noFetchAll = false,
    noFetchTags = false,
    noInstall = false,
    noPush = false,
    preid = '',
    releaseAs = ReleaseAsPresets.AUTO,
    rollupChangelog = false,
    uniqify = false,
    updateOptional = false,
    updatePeer = false,
  } = opts ?? {};
  const fixedCWD = fixCWD(cwd);

  const customConfig = customConfigOverride ?? (await readLetsVersionConfig(fixedCWD));

  let yes = opts?.yes || false;

  if (dryRun) console.warn('**Dry Run has been enabled**');

  if (noCommit && !noPush)
    console.warn(
      'You supplied --no-commit but not --no-push. This will set --no-push to true to avoid pushing uncommitted changes',
    );

  const workingDirUnclean = !allowUncommitted && (await gitWorkdirUnclean(fixedCWD));

  if (workingDirUnclean) {
    console.warn('Unable to apply version bumps because', fixedCWD, 'has uncommitted changes');
    return null;
  }

  const allPackages = await getPackages(fixedCWD);

  if (!allPackages.length) return null;

  const synchronized = await getRecommendedBumpsByPackage({
    cwd: fixedCWD,
    names,
    releaseAs,
    preid,
    uniqify,
    forceAll,
    noFetchAll,
    noFetchTags,
    updatePeer,
    updateOptional,
  });
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
        }  type: ${BumpTypeToString[b.type]}${os.EOL}  valid: ${b.isValid}${os.EOL}  private: ${
          b.packageInfo.isPrivate
        }`,
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
        return console.info(
          `Will write package.json updates for ${b.packageInfo.name} to ${b.packageInfo.packageJSONPath}`,
        );
      }
      return fs.writeFile(b.packageInfo.packageJSONPath, JSON.stringify(b.packageInfo.pkg, null, 2), 'utf-8');
    }),
  );

  // install deps to ensure lockfiles are updated
  const pm = await detectPM({ cwd: fixedCWD });

  if (!noInstall) {
    if (dryRun) console.info(`Will run ${pm} install to synchronize lockfiles`);
    else {
      let didSyncLockFiles = false;
      /**
       * As of 5/30/2023, there is an open bug with NPM that causes "npm ci" to fail
       * due to some internal race condition where lockfiles need a subsequent
       * npm install to flush out all the changes.
       * https://github.com/npm/cli/issues/4859#issuecomment-1120018666
       * and
       * https://github.com/npm/cli/issues/4942
       */
      const syncLockfiles = () => {
        if (didSyncLockFiles) return;
        try {
          execSync(`${pm} install`, { cwd: fixedCWD, stdio: 'inherit' });
          didSyncLockFiles = true;
        } catch (error) {
          didSyncLockFiles = false;
        }
      };
      syncLockfiles();
      syncLockfiles();

      if (!didSyncLockFiles) {
        console.error('Failed to synchronize lock files. Aborting remaining operations');
        process.exit(1);
      }
    }
  }

  // generate changelogs
  if (!noChangelog) {
    // there may be packages that now need to have changelogs updated
    // because they're being bumped as the result of dep tree updates.
    // we need to apply some additional changelogs if that's the casue
    const changelogInfo = await getChangelogUpdateForPackageInfo({
      commits: synchronized.conventional,
      bumps: synchronized.bumps,
      lineFormatter: customConfig?.changelog?.changelogLineFormatter,
      changelogDependencies,
    });

    for (const syncbump of synchronized.bumps) {
      if (presyncBumpsByPackageName.has(syncbump.packageInfo.name)) continue;

      changelogInfo.push(
        new ChangelogUpdate(getFormattedChangelogDate(), syncbump, {
          [ChangelogEntryType.MISC]: new ChangelogUpdateEntry(
            ChangelogEntryType.MISC,
            [
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
            ],
            customConfig?.changelog?.changelogLineFormatter,
          ),
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
        const changelogUpdates =
          customConfig?.changelog?.changeLogEntryFormatter?.(c) ?? `${c.toString()}${os.EOL}---${os.EOL}${os.EOL}`;

        if (dryRun) {
          console.info(
            `Will write the following changelog update to ${c.changelogPath}:${os.EOL}${os.EOL}${changelogUpdates}`,
          );
        } else await fs.writeFile(c.changelogPath, `${changelogUpdates}${existingChangelog}`, 'utf-8');
      }),
    );

    if (rollupChangelog) {
      // User wants an aggregated changelog at the root.
      // if this repo only has a single package AND that package is marked
      // as the root package, do nothing

      const continueWithRollupChangelog =
        (synchronized.packages.length === 1 && !synchronized.packages[0]?.root) || synchronized.packages.length > 1;

      if (continueWithRollupChangelog) {
        const changelogUpdates = new ChangelogAggregateUpdate(fixedCWD, getFormattedChangelogDate(), changelogInfo);
        if (!dryRun) await fs.ensureFile(changelogUpdates.changelogPath);

        let existingChangelog = '';
        try {
          existingChangelog = await fs.readFile(changelogUpdates.changelogPath, 'utf-8');
        } catch (error) {}

        const updatesToWrite = customConfig?.changelog?.changeLogRollupFormatter
          ? customConfig?.changelog?.changeLogRollupFormatter(changelogUpdates)
          : changelogUpdates.toString();

        if (dryRun) {
          console.info(
            `Will write the following rollup changelog updated to ${changelogUpdates.changelogPath}:${os.EOL}${os.EOL}${
              updatesToWrite || ''
            }`,
          );
        } else if (updatesToWrite) {
          await fs.writeFile(changelogUpdates.changelogPath, `${updatesToWrite}${existingChangelog}`, 'utf-8');
        }
      }
    }
  }

  // commit the stuffs
  if (!noCommit) {
    const header = 'Version Bump';
    const body = synchronized.bumps.map(b => `${b.packageInfo.name}@${b.to}`).join(os.EOL);
    if (dryRun) {
      console.info(
        `~~~~~${os.EOL}Will create a git commit with the following message:${os.EOL}${os.EOL}${header}${os.EOL}${os.EOL}${body}${os.EOL}~~~~~`,
      );
    } else await gitCommit(header, body, '', fixedCWD);
  }

  // create all the git tags
  /** @type {string[]} */
  let tagsToPush = [];
  if (!noCommit) {
    tagsToPush = await Promise.all(
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
  }

  if (!noPush) {
    // push to upstream
    if (dryRun) console.info(`Will git push --no-verify all changes made during the version bump operation`);
    else await gitPush(fixedCWD);

    if (dryRun) console.info(`Will push the following git tags: ${tagsToPush.join(' ')}`);
    else if (tagsToPush.length) await gitPushTags(tagsToPush, fixedCWD);
  }

  return synchronized;
}

/**
 * Builds a local repository-only dependency graph. If you are in a monorepo, this is useful to visualize how the dependencies in said monorepo relate to each other.
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function localDepGraph(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);
  return buildLocalDependencyGraph(fixedCWD);
}
