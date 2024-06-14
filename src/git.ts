import appRootPath from 'app-root-path';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { fixCWD } from './cwd.js';
import { execAsync, execSync } from './exec.js';
import { parseToConventional } from './parser.js';
import { GitCommit, GitCommitWithConventionalAndPackageInfo, PackageInfo, PublishTagInfo } from './types.js';
import { chunkArray } from './util.js';

let didFetchAll = false;
/**
 * Fetches all tracking information from origin.
 * Most importantly, this tries to detect whether we're currently
 * in a shallow clone.
 *
 * @param {string} [cwd=appRootPath.toString()]
 */
export function gitFetchAll(cwd = appRootPath.toString()) {
  if (didFetchAll) return;

  const fixedCWD = fixCWD(cwd);

  let isShallow = false;
  const stat = fs.statSync(path.join(fixedCWD, '.git', 'shallow'), { throwIfNoEntry: false });
  isShallow = stat?.isFile() ?? false;

  if (isShallow) {
    console.warn(
      `Current git repository is a **SHALLOW CLONE**. Limited git history may be available, which may result in "lets-version" version bump failures due to missing or incomplete git history.`,
    );
  }

  execSync('git fetch origin', { cwd: fixedCWD, stdio: 'ignore' });
  didFetchAll = true;
}

let didFetchAllTags = false;
/**
 * Pulls in all tags from origin and forces local to be updated
 * @param {string} [cwd=appRootPath.toString()]
 */
export function gitFetchAllTags(cwd = appRootPath.toString()) {
  if (didFetchAllTags) return;

  const fixedCWD = fixCWD(cwd);

  execSync('git fetch origin --tags --force', { cwd: fixedCWD, stdio: 'ignore' });
  didFetchAllTags = true;
}

/**
 * Returns commits since a particular git SHA or tag.
 * If the "since" parameter isn't provided, all commits
 * from the dawn of man are returned
 *
 * @param {string | null | undefined} [since=''] - If provided, fetches all commits since this particular git SHA or Tag
 * @param {string | null | undefined} [relPath=''] - If provided, scopes gitLog to only check for changes within a specific subdirectory
 * @param {string} [cwd=appRootPath.toString] - Where the git logic should run. Defaults to your repository root
 * @returns {Promise<GitCommit[]>}
 */
export async function gitCommitsSince(since = '', relPath = '', cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  let cmd = 'git --no-pager log';

  const DELIMITER = '~~~***~~~';
  const LINE_DELIMITER = '====----====++++====';

  cmd += ` --format=${DELIMITER}%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ad${DELIMITER}%B${LINE_DELIMITER}`;
  if (since) cmd += ` ${since}..`;
  if (relPath) cmd += ` -- ${relPath}`;

  const { stdout } = await execAsync(cmd, { cwd: fixedCWD, stdio: 'pipe' });

  return stdout
    .split(LINE_DELIMITER)
    .filter(Boolean)
    .map(line => {
      const trimmed = line.trim();

      const [sha = '', author = '', email = '', date = '', message = ''] = trimmed.split(DELIMITER).filter(Boolean);
      return new GitCommit(author, date, email, message, sha);
    })
    .filter(commit => Boolean(commit.sha));
}

let remoteTagsCache: Array<[string, string]> | null = null;

/**
 * Grabs the full list of all tags available on upstream
 *
 * @param {string} [cwd=appRootPath.toString()] - Nearest .git repo
 *
 * @returns {Array<[string, string]>}
 */
export function gitRemoteTags(cwd = appRootPath.toString()) {
  if (remoteTagsCache) return remoteTagsCache;

  const fixedCWD = fixCWD(cwd);

  // since this function may be called multiple times in a workflow,
  // we want to avoid accidentally getting different results
  remoteTagsCache = execSync('git ls-remote --tags origin', { cwd: fixedCWD, stdio: 'pipe' })
    .stdout.trim()
    .split(os.EOL)
    .filter(Boolean)
    .map(t => {
      const [sha = '', ref = ''] = t.split(/\s+/);

      return [ref.replace('refs/tags/', ''), sha];
    });

  return remoteTagsCache;
}

let localTagsCache: Array<[string, string]> | null = null;
/**
 * Grabs the full list of all tags available locally
 *
 * @param {string} [cwd=appRootPath.toString()] - Neartest .git repo
 * @returns {Array<[string, string]>}
 */
export function gitLocalTags(cwd = appRootPath.toString()) {
  if (localTagsCache) return localTagsCache;

  const fixedCWD = fixCWD(cwd);

  try {
    // since this function may be called multiple times in a workflow,
    // we want to avoid accidentally getting different results
    localTagsCache = execSync('git show-ref --tags', { cwd: fixedCWD, stdio: 'pipe' })
      .stdout.trim()
      .split(os.EOL)
      .filter(Boolean)
      .map(t => {
        const [sha = '', ref = ''] = t.split(/\s+/);

        return [ref.replace('refs/tags/', ''), sha];
      });

    return localTagsCache;
  } catch (error) {
    // According to the official git documentation, zero results will cause an exit code of "1"
    // https://git-scm.com/docs/git-show-ref#_examples
    if (error.exitCode === 1) return [];
    throw error;
  }
}

/**
 * Given a package info object, returns a formatted string
 * that can be safely used as a git version tag
 */
export function formatVersionTagForPackage(packageInfo: PackageInfo): string {
  return `${packageInfo.name}@${packageInfo.version}`;
}

/**
 * Given a javascript package info object, checks to see if there's
 * a git tag for its current version. If it's found, its SHA is returned.
 * If one for the current version is not found, all existing tags are scanned
 * to find the closest match, and that is returned. If one isn't found, null
 * is returned.
 */
export async function gitLastKnownPublishTagInfoForPackage(
  packageInfo: PackageInfo,
  cwd = appRootPath.toString(),
): Promise<PublishTagInfo | null> {
  const fixedCWD = fixCWD(cwd);

  // tag may either be on upstream or local-only. We need to treat both cases as "exists"
  const allRemoteTag = gitRemoteTags(fixedCWD);
  const allLocalTags = gitLocalTags(fixedCWD);

  // newest / largest tags first
  const allTags = [...allRemoteTag, ...allLocalTags].sort((a, b) => b[0].localeCompare(a[0]));

  const allRemoteTagsMap = new Map(allTags);

  let tag = formatVersionTagForPackage(packageInfo);
  let match = allRemoteTagsMap.get(tag);
  if (!match) {
    // no dice on a tag match for the latest posted version in the package.json file.
    // we now need to scan through all tags and find the "closest" semver match

    /** @type {string | null} */
    let largestTag = null;
    for (const tag of allRemoteTagsMap.keys()) {
      if (tag.includes(packageInfo.name)) {
        if (!largestTag) {
          largestTag = tag;
          continue;
        }

        const tagSemver = semver.coerce(tag);
        const largestTagSemver = semver.coerce(largestTag);

        if (!tagSemver || !largestTagSemver) continue;

        if (tagSemver.compare(largestTagSemver) > 0) largestTag = tag;
      }
    }
    if (largestTag) {
      tag = formatVersionTagForPackage({ ...packageInfo, version: semver.coerce(largestTag)?.version ?? '' });
      match = allRemoteTagsMap.get(tag);
    }
  }
  return match ? new PublishTagInfo(packageInfo.name, tag, match) : null;
}

/**
 * Checks to see if there is a Git tag used for the last publish for a list of packages
 */
export async function getLastKnownPublishTagInfoForAllPackages(
  packages: PackageInfo[],
  noFetchTags: boolean,
  cwd = appRootPath.toString(),
): Promise<PublishTagInfo[]> {
  const fixedCWD = fixCWD(cwd);

  if (!noFetchTags) gitFetchAllTags(fixedCWD);

  // warm up the tags cache
  gitRemoteTags(fixedCWD);
  gitLocalTags(fixedCWD);

  return Promise.all(
    packages.map(async p => {
      const result = await gitLastKnownPublishTagInfoForPackage(p, fixedCWD);

      return new PublishTagInfo(p.name, result?.tag ?? null, result?.sha ?? null);
    }),
  );
}

/**
 * Given a specific git sha, finds all files that have been modified
 * since the sha and returns the absolute filepaths
 */
export async function gitAllFilesChangedSinceSha(sha: string, cwd = appRootPath.toString()): Promise<string[]> {
  const fixedCWD = fixCWD(cwd);

  const { stdout } = await execAsync(`git --no-pager diff --name-only ${sha}..`, { cwd: fixedCWD, stdio: 'pipe' });
  return stdout
    .trim()
    .split(os.EOL)
    .filter(Boolean)
    .map(fp => path.resolve(path.join(cwd, fp)));
}

/**
 * Given an input of parsed git tag infos,
 * returns all the files that have changed since any of these git tags
 * have occured, with duplicates removed
 */
export async function getAllFilesChangedSinceTagInfos(
  filteredPackages: PackageInfo[],
  tagInfos: PublishTagInfo[],
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);

  const packageNameLookup = new Map(filteredPackages.map(p => [p.name, p]));

  const results = (
    await Promise.all(
      tagInfos.map(async t => {
        if (!t.sha) return [];
        const pkg = packageNameLookup.get(t.packageName);
        const results = await gitAllFilesChangedSinceSha(t.sha, fixedCWD);

        // This should never happen, but
        // we'll guard just to silence the compiler
        if (!pkg) return results;

        return results.filter(fp => fp.startsWith(pkg.packagePath));
      }),
    )
  ).flat();

  return Array.from(new Set(results));
}

/**
 * Given an input of the "main" branch name,
 * returns all the files that have changed since the current branch was created
 */
export async function getAllFilesChangedSinceBranch(
  filteredPackages: PackageInfo[],
  branch: string,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);
  const allFiles = await gitAllFilesChangedSinceSha(branch, fixedCWD);

  const results = filteredPackages
    .map(pkg => {
      return allFiles.filter(fp => fp.startsWith(pkg.packagePath));
    })
    .flat();

  return Array.from(new Set(results));
}

/**
 * Gets full git commit, with conventional commits parsed data,
 * for a single, parsed package info
 */
export async function gitConventionalForPackage(
  packageInfo: PackageInfo,
  noFetchAll = false,
  cwd = appRootPath.toString(),
): Promise<GitCommitWithConventionalAndPackageInfo[]> {
  const fixedCWD = fixCWD(cwd);

  if (!noFetchAll) gitFetchAll(fixedCWD);
  const taginfo = await gitLastKnownPublishTagInfoForPackage(packageInfo, fixedCWD);
  const relPackagePath = path.relative(cwd, packageInfo.packagePath);

  if (!taginfo?.sha) {
    throw new Error(
      `unable to git conventional commits for package because no git sha was returned when computing last known publish tag for package ${packageInfo.name}`,
    );
  }

  const results = await gitCommitsSince(taginfo?.sha, relPackagePath, fixedCWD);
  const conventional = parseToConventional(results);

  return conventional.map(
    c =>
      new GitCommitWithConventionalAndPackageInfo(
        c.author,
        c.date,
        c.email,
        c.message,
        c.sha,
        c.conventional,
        packageInfo,
      ),
  );
}

/**
 * Gets full git commit, with conventional commits parsed data,
 * for all provided packages
 */
export async function gitConventionalForAllPackages(
  packageInfos: PackageInfo[],
  noFetchAll = false,
  cwd = appRootPath.toString(),
): Promise<GitCommitWithConventionalAndPackageInfo[]> {
  const fixedCWD = fixCWD(cwd);

  return (await Promise.all(packageInfos.map(async p => gitConventionalForPackage(p, noFetchAll, fixedCWD)))).flat();
}

/**
 * Creates a git commit, based on whatever changes are active
 */
export async function gitCommit(header: string, body?: string, footer?: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // add files silently
  await execAsync('git add .', { cwd, stdio: 'ignore' });

  let message = header;
  if (body) message += `${os.EOL}${os.EOL}${body}`;
  if (footer) message += `${os.EOL}${os.EOL}${footer}`;

  // write temp file to use as the git commit message
  const tempFilePath = path.join(os.tmpdir(), '__lets-version-commit-msg__');
  await fs.ensureFile(tempFilePath);
  await fs.writeFile(tempFilePath, message, 'utf-8');

  // commit silently
  await execAsync(`git commit -F ${tempFilePath} --no-verify`, { cwd: fixedCWD, stdio: 'ignore' });

  // remove the commit msg file
  await fs.remove(tempFilePath);
}

/**
 * Pushes current local changes to upstream / origin
 */
export async function gitPush(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await execAsync('git push --no-verify', { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Git pushes a single tag to upstream / origin
 */
export async function gitPushTag(tag: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await execAsync(`git push origin ${tag} --no-verify`, { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Git pushes multiple tags at the same time
 */
export async function gitPushTags(tags: string[], cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // only push 5 at a time
  const chunkedTags = chunkArray(tags);

  for (const chunk of chunkedTags) {
    await Promise.all(chunk.map(async tag => gitPushTag(tag, fixedCWD)));
  }
}

/**
 * Creates a git tag
 */
export async function gitTag(tag: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await execAsync(`git tag ${tag}`, { cwd: fixedCWD, stdio: 'ignore' });
}

/**
 * Checks the current repo to see if there are any outstanding changes
 *
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<boolean>}
 */
export async function gitWorkdirUnclean(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const statusResult = (await execAsync('git status -s', { cwd: fixedCWD, stdio: 'pipe' })).stdout.trim();

  // split by newlines, just in case
  return statusResult.split(os.EOL).filter(Boolean).length > 0;
}

/**
 * Gets the current shortened commit SHA
 *
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitCurrentSHA(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const result = (await execAsync('git rev-parse --short HEAD', { cwd: fixedCWD, stdio: 'pipe' })).stdout.trim();

  return result;
}
