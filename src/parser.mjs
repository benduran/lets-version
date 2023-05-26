/**
 * @typedef {import('./types.mjs').GitCommit} GitCommit
 */

import { sync as conventionalParser } from 'conventional-commits-parser';

import {
  BumpType,
  ConventionalCommitType,
  GitCommitWithConventional,
  GitConventional,
  GitConventionalNote,
} from './types.mjs';

/**
 * Given an array of already parsed commits, attempts
 * to use the official conventional commits parser
 * to map details into an enriched Commit object
 * @param {GitCommit[]} commits
 *
 * @returns {GitCommitWithConventional[]}
 */
export function parseToConventional(commits) {
  const mergePattern =
    /^merge\s+(branch|tag|commit|pull\srequest|remote-tracking\s+branch)\s+'([^']+)'(?:\s+of\s+(.*))?$/i;

  return commits.map(c => {
    const details = conventionalParser(c.message, { mergeCorrespondence: ['sourceType', 'source'], mergePattern });
    return new GitCommitWithConventional(
      c.author,
      c.date,
      c.email,
      c.message,
      c.sha,
      new GitConventional({
        body: details.body,
        footer: details.footer,
        header: details.header,
        mentions: details.mentions,
        merge: details.merge,
        notes: details.notes.map(n => new GitConventionalNote(n.title, n.text)),
        // references: details.references,
        // revert: details.revert,
        scope: details.scope,
        subject: details.subject,
        type: details.type,
      }),
    );
  });
}

/**
 * Given a git commit that's been parsed into a conventional commit format
 * returns a bump type recommendation
 *
 * @param {GitCommitWithConventional} commit
 *
 * @returns {BumpType}
 */
export function conventionalCommitToBumpType(commit) {
  const {
    conventional: { type },
  } = commit;

  if (type === ConventionalCommitType.FEAT) return BumpType.MINOR;
  return BumpType.PATCH;
}
