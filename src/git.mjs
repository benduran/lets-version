/** @typedef {import('./types.mjs').PackageInfo} PackageInfo */

import appRootPath from 'app-root-path';
import { execaCommand } from 'execa';
import os from 'os';
import semver from 'semver';

import { GitCommit } from './types.mjs';

/**
 * Returns commits since a particular git SHA or tag.
 * If the "since" parameter isn't provided, all commits
 * from the dawn of man are returned
 *
 * @param {string} [since=''] - If provided, fetches all commits since this particular git SHA or Tag
 * @param {string} [cwd=appRootPath.toString] - Where the git logic should run. Defaults to your repository root
 * @returns {Promise<GitCommit[]>}
 */
export async function gitCommitsSince(since = '', cwd = appRootPath.toString()) {
  let cmd = 'git --no-pager log';

  const DELIMITER = '~~~***~~~';
  const LINE_DELIMITER = '====----====++++====';

  cmd += ` --format=${DELIMITER}%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ad${DELIMITER}%B${LINE_DELIMITER}`;
  if (since) cmd += ` ${since}..`;

  const { stdout } = await execaCommand(cmd, { cwd, stdio: 'pipe' });

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
  return (await execaCommand('git ls-remote --tags origin', { cwd, stdio: 'pipe' })).stdout
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
  return (await execaCommand('git show-ref --tags', { cwd, stdio: 'pipe' })).stdout
    .trim()
    .split(os.EOL)
    .filter(Boolean)
    .map(t => {
      const [sha = '', ref = ''] = t.split(/\s+/);

      return [ref.replace('refs/tags/', ''), sha];
    });
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
 * @returns {Promise<string | null>}
 */
export async function gitLastKnownPublishTagShaForPackage(packageInfo, cwd = appRootPath.toString()) {
  // tag may either be on upstream or local-only. We need to treat both cases as "exists"
  const allRemoteTag = await gitRemoteTags(cwd);
  const allLocalTags = await gitLocalTags(cwd);

  // newest / largest tags first
  const allTags = [...allRemoteTag, ...allLocalTags].sort((a, b) => b[0].localeCompare(a[0]));

  const allRemoteTagsMap = new Map(allTags);

  let match = allRemoteTagsMap.get(formatVersionTagForPackage(packageInfo));
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
      match = allRemoteTagsMap.get(
        formatVersionTagForPackage({ ...packageInfo, version: semver.coerce(largestTag)?.version ?? '' }),
      );
    }
  }
  return match ?? null;
}
