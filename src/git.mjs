/** @typedef {import('./types.mjs').PackageInfo} PackageInfo */

import appRootPath from 'app-root-path';
import { execaCommand } from 'execa';
import os from 'os';

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
 * Otherwise, null is returned
 *
 * @param {PackageInfo} packageInfo
 *
 * @returns {Promise<string | null>}
 */
export async function gitTagForPackage(packageInfo, cwd = appRootPath.toString()) {
  // tag may either be on upstream or local-only. We need to treat both cases as "exists"
  const { stdout: allRemoteTagsStr } = await execaCommand('git ls-remote --tags origin', { cwd, stdio: 'pipe' });
  const { stdout: allLocalTagsStr } = await execaCommand('git show-ref --tags', { cwd, stdio: 'pipe' });

  const allRemoteTagsMap = new Map(
    `${allRemoteTagsStr}${os.EOL}${allLocalTagsStr}`
      .split(os.EOL)
      .filter(Boolean)
      .map(t => {
        const [sha = '', ref = ''] = t.split(/\s+/);

        return [ref.replace('refs/tags/', ''), sha];
      }),
  );

  return allRemoteTagsMap.get(formatVersionTagForPackage(packageInfo)) ?? null;
}
