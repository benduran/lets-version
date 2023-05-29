/** @typedef {import('./types.mjs').PackageInfo} PackageInfo */

import appRootPath from 'app-root-path';
import { execaCommand } from 'execa';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { fixCWD } from './cwd.mjs';
import { parseToConventional } from './parser.mjs';
import { GitCommit, GitCommitWithConventionalAndPackageInfo, PublishTagInfo } from './types.mjs';

/**
 * Pulls in all tags from origin and forces local to be updated
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitFetchAllTags(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);
  await execaCommand('git fetch origin --tags --force', { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Returns commits since a particular git SHA or tag.
 * If the "since" parameter isn't provided, all commits
 * from the dawn of man are returned
 *
 * @param {string | null | undefined} [since=''] - If provided, fetches all commits since this particular git SHA or Tag
 * @param {string} [cwd=appRootPath.toString] - Where the git logic should run. Defaults to your repository root
 * @returns {Promise<GitCommit[]>}
 */
export async function gitCommitsSince(since = '', cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  let cmd = 'git --no-pager log';

  const DELIMITER = '~~~***~~~';
  const LINE_DELIMITER = '====----====++++====';

  cmd += ` --format=${DELIMITER}%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ad${DELIMITER}%B${LINE_DELIMITER}`;
  if (since) cmd += ` ${since}..`;

  const { stdout } = await execaCommand(cmd, { cwd: fixedCWD, stdio: 'pipe' });

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

/**
 * Grabs the full list of all tags available on upstream
 *
 * @param {string} [cwd=appRootPath.toString()] - Nearest .git repo
 *
 * @returns {Promise<Array<[string, string]>>}
 */
export async function gitRemoteTags(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  return (await execaCommand('git ls-remote --tags origin', { cwd: fixedCWD, stdio: 'pipe' })).stdout
    .trim()
    .split(os.EOL)
    .filter(Boolean)
    .map(t => {
      const [sha = '', ref = ''] = t.split(/\s+/);

      return [ref.replace('refs/tags/', ''), sha];
    });
}

/**
 * Grabs the full list of all tags available locally
 *
 * @param {string} [cwd=appRootPath.toString()] - Neartest .git repo
 * @returns {Promise<Array<[string, string]>>}
 */
export async function gitLocalTags(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  try {
    return (await execaCommand('git show-ref --tags', { cwd: fixedCWD, stdio: 'pipe' })).stdout
      .trim()
      .split(os.EOL)
      .filter(Boolean)
      .map(t => {
        const [sha = '', ref = ''] = t.split(/\s+/);

        return [ref.replace('refs/tags/', ''), sha];
      });
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
 *
 * @param {PackageInfo} packageInfo
 *
 * @returns {string}
 */
export function formatVersionTagForPackage(packageInfo) {
  return `${packageInfo.name}@${packageInfo.version}`;
}

/**
 * Given a javascript package info object, checks to see if there's
 * a git tag for its current version. If it's found, its SHA is returned.
 * If one for the current version is not found, all existing tags are scanned
 * to find the closest match, and that is returned. If one isn't found, null
 * is returned.
 *
 * @param {PackageInfo} packageInfo
 *
 * @returns {Promise<PublishTagInfo | null>}
 */
export async function gitLastKnownPublishTagInfoForPackage(packageInfo, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // tag may either be on upstream or local-only. We need to treat both cases as "exists"
  const allRemoteTag = await gitRemoteTags(fixedCWD);
  const allLocalTags = await gitLocalTags(fixedCWD);

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
 *
 * @param {PackageInfo[]} packages
 * @param {boolean} noFetchTags
 * @param {string} [cwd=appRootPath.toString]
 *
 * @returns {Promise<PublishTagInfo[]>}
 */
export async function getLastKnownPublishTagInfoForAllPackages(packages, noFetchTags, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  if (!noFetchTags) await gitFetchAllTags(fixedCWD);

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
 *
 * @param {string} sha
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<string[]>}
 */
export async function gitAllFilesChangedSinceSha(sha, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const { stdout } = await execaCommand(`git --no-pager diff --name-only ${sha}..`, { cwd: fixedCWD, stdio: 'pipe' });
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
 *
 * @param {PublishTagInfo[]} tagInfos
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function getAllFilesChangedSinceTagInfos(tagInfos, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const results = (
    await Promise.all(tagInfos.map(async t => (t.sha ? gitAllFilesChangedSinceSha(t.sha, fixedCWD) : [])))
  ).flat();

  return Array.from(new Set(results));
}

/**
 * Gets full git commit, with conventional commits parsed data,
 * for a single, parsed package info
 *
 * @param {PackageInfo} packageInfo
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function gitConventionalForPackage(packageInfo, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const taginfo = await gitLastKnownPublishTagInfoForPackage(packageInfo, fixedCWD);
  const results = await gitCommitsSince(taginfo?.sha, fixedCWD);
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
 *
 * @param {PackageInfo[]} packageInfos
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<GitCommitWithConventionalAndPackageInfo[]>}
 */
export async function gitConventionalForAllPackages(packageInfos, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  return (await Promise.all(packageInfos.map(async p => gitConventionalForPackage(p, fixedCWD)))).flat();
}

/**
 * Creates a git commit, based on whatever changes are active
 *
 * @param {string} header
 * @param {string} [body]
 * @param {string} [footer]
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitCommit(header, body, footer, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // add files silently
  await execaCommand('git add .', { cwd, stdio: 'ignore' });

  let message = header;
  if (body) message += `${os.EOL}${os.EOL}${body}`;
  if (footer) message += `${os.EOL}${os.EOL}${footer}`;

  // write temp file to use as the git commit message
  const tempFilePath = path.join(os.tmpdir(), '__lets-version-commit-msg__');
  await fs.ensureFile(tempFilePath);
  await fs.writeFile(tempFilePath, message, 'utf-8');

  // commit silently
  await execaCommand(`git commit -F ${tempFilePath} --no-verify`, { cwd: fixedCWD, stdio: 'ignore' });

  // remove the commit msg file
  await fs.remove(tempFilePath);
}

/**
 * Pushes current local changes to upstream / origin
 *
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitPush(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await execaCommand('git push --no-verify', { cwd: fixedCWD, stdio: 'inherit' });
  await execaCommand('git push --tags --no-verify', { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Creates a git tag
 *
 * @param {string} tag
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitTag(tag, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await execaCommand(`git tag ${tag}`, { cwd: fixedCWD, stdio: 'ignore' });
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

  const statusResult = (await execaCommand('git status -s', { cwd: fixedCWD, stdio: 'pipe' })).stdout.trim();

  // split by newlines, just in case
  return statusResult.split(os.EOL).filter(Boolean).length > 0;
}
