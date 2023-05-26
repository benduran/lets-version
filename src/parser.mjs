/**
 * @typedef {import('./types.mjs').GitCommit} GitCommit
 */

import { sync as conventionalParser } from 'conventional-commits-parser';

import { GitCommitWithConventional, GitConventional, GitConventionalNote } from './types.mjs';

/**
 * Attempts to sniff out and parse the detected Conventional Commit
 * type to a stable type
 *
 * @param {string | undefined} type
 */
const parseConventionalType = type => {
  switch (type) {
  }
};

/**
 * Given an array of already parsed commits, attempts
 * to use the official conventional commits parser
 * to map details into an enriched Commit object
 * @param {GitCommit[]} commits
 *
 * @returns {GitCommitWithConventional[]}
 */
export function parseToConventional(commits) {
  return commits.map(c => {
    const details = conventionalParser(c.message);
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
