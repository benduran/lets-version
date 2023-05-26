/** @typedef {import('./types.mjs').PackageInfo} PackageInfo */

import appRootPath from 'app-root-path';
import { execaCommand } from 'execa';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { fixCWD } from './cwd.mjs';
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

  return (await execaCommand('git show-ref --tags', { cwd: fixedCWD, stdio: 'pipe' })).stdout
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
 * @returns {Promise<{ sha: string, tag: string } | null>}
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
  return match ? { tag, sha: match } : null;
}

/**
 * Checks to see if there is a Git tag used for the last publish for a list of packages
 *
 * @param {PackageInfo[]} packages
 * @param {string} [cwd=appRootPath.toString]
 *
 * @returns {Promise<Array<{ packageName: string, tag: string | null, sha: string | null }>>}
 */
export async function getLastKnownPublishTagInfoForAllPackages(packages, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  return Promise.all(
    packages.map(async p => {
      const result = await gitLastKnownPublishTagInfoForPackage(p, fixedCWD);

      return {
        packageName: p.name,
        sha: result?.sha ?? null,
        tag: result?.tag ?? null,
      };
    }),
  );
}

/**
 * Given a specific git sha, finds all files that have been modified
 * since the sha and returns just the filenames
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
    .map(fp => path.join(cwd, fp));
}
