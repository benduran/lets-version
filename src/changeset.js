/** @typedef {import('./types.js').GitCommit} GitCommit */

import appRootPath from 'app-root-path';
import fs from 'fs-extra';
import LZString from 'lz-string';
import os from 'os';
import path from 'path';

import { fixCWD } from './cwd.js';
import { gitAdd, gitAmend, gitCommitsSince, gitRevParse } from './git.js';

export const DEFAULT_CHANGESET_FILE_PATH = path.join(process.cwd(), '.lets-version-changes');

const LOCKFILE_PATH = path.join(os.tmpdir(), '__let-version-post-commit-lock__');

/**
 * Given a git commit that was literally just committed (we're in a post-commit hook execution phase),
 * gets the commit message and list of changed files and updated the tracked
 * changeset lets-version needs to version bump in the future
 *
 * @param {string} [filePath]
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function upsertChangeset(filePath = DEFAULT_CHANGESET_FILE_PATH, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const commitsSince = await gitCommitsSince(await gitRevParse('HEAD~1', fixedCWD), undefined, fixedCWD);

  const [commitDetails] = commitsSince;
  if (!commitDetails) return null;

  await fs.ensureFile(filePath);

  const inflatedChangesetStr = LZString.decompress((await fs.readFile(filePath, 'utf-8')).trim());

  const existingChangeset = inflatedChangesetStr ? JSON.parse(inflatedChangesetStr) : null;

  /** @type {GitCommit[]} */
  const update = [...(existingChangeset ?? []), commitDetails];
  const duplicatesRemoved = new Map(update.map(u => [u.sha, u]));

  // check to see if we have the lockfile in place to prevent infinite post-commit hook loops
  try {
    const stat = await fs.stat(LOCKFILE_PATH);
    if (stat.isFile()) {
      await fs.remove(LOCKFILE_PATH);
      return duplicatesRemoved;
    }
  } catch (error) {}

  await fs.writeFile(filePath, LZString.compress(JSON.stringify(Array.from(duplicatesRemoved.values()))), 'utf-8');

  await gitAdd([path.relative(fixedCWD, filePath)], fixedCWD);
  await gitAmend(commitDetails.message);

  return update;
}

upsertChangeset().then(r => console.info(JSON.stringify(r, null, 2)));
