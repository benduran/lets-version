import appRootPath from 'app-root-path';
import { execaCommand } from 'execa';

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

  if (since) cmd += ` ${since}`;
  cmd += ` --format=${DELIMITER}%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ad${DELIMITER}%B${LINE_DELIMITER}`;

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
