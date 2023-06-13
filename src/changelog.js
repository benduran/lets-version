/**
 * @typedef {import('./types.js').PackageInfo} PackageInfo
 * @typedef {import('./types.js').BumpRecommendation} BumpRecommendation
 * @typedef {import('./types.js').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 * @typedef {import('./types.js').ChangeLogLineFormatter} ChangeLogLineFormatter
 */

import dayjs from 'dayjs';

import { conventionalCommitToBumpType } from './parser.js';
import {
  BumpType,
  ChangelogEntryType,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  ConventionalCommitType,
  GitConventional,
} from './types.js';

/**
 * @typedef {Object} GenerateChangelogOpts
 * @property {BumpRecommendation[]} bumps
 * @property {GitCommitWithConventionalAndPackageInfo[]} commits
 * @property {ChangeLogLineFormatter} [lineFormatter]
 */

/**
 * Simple utility function to return a consistent date for changelog headers
 *
 * @returns {string}
 */
export function getFormattedChangelogDate() {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Given a fully parsed package and conventional commits (represented by a GitCommitWithConventionalAndPackageInfo object),
 * generates a changelog update message that can be safely prepended to
 * a package's CHANGELOG.md file
 *
 * @param {GenerateChangelogOpts} opts
 *
 * @returns {Promise<ChangelogUpdate[]>}
 */
export async function getChangelogUpdateForPackageInfo(opts) {
  const bumpsByPackageName = new Map(opts.bumps.map(b => [b.packageInfo.name, b]));

  /** @type {Map<string, GitCommitWithConventionalAndPackageInfo[]>} */
  const conventionalByPackageName = new Map();
  for (const c of opts.commits) {
    const existing = conventionalByPackageName.get(c.packageInfo.name) ?? [];
    conventionalByPackageName.set(c.packageInfo.name, [...existing, c]);
  }

  /** @type {ChangelogUpdate[]} */
  const out = [];

  /** @type {Set<string>} */
  const processedConventionalForPackageName = new Set();

  for (const [packageName, commits] of conventionalByPackageName.entries()) {
    const bumpRecommendation = bumpsByPackageName.get(packageName);
    if (!bumpRecommendation) {
      throw new Error(
        `Unable to getChangelogUpdateForPackageInfo because ${packageName} was not found in the bumpsByPackageName map`,
      );
    }

    const toPush = new ChangelogUpdate(getFormattedChangelogDate(), bumpRecommendation, {});
    for (const c of commits) {
      // can't reliably write out a changelog without a meaningful header

      if (!c.conventional.header) continue;
      const commitBumpType = conventionalCommitToBumpType(c);

      /** @type {ChangelogEntryType} */
      let entryType;

      if (commitBumpType === BumpType.FIRST || commitBumpType === BumpType.MAJOR)
        entryType = ChangelogEntryType.BREAKING;
      else if (commitBumpType === BumpType.MINOR) entryType = ChangelogEntryType.FEATURES;
      else if (c.conventional.type === ConventionalCommitType.FIX) entryType = ChangelogEntryType.FIXES;
      else if (c.conventional.type === ConventionalCommitType.DOCS) entryType = ChangelogEntryType.DOCS;
      else entryType = ChangelogEntryType.MISC;

      // these should be commits only scoped to this specific package
      const existingForEntry = toPush.entries[entryType];

      processedConventionalForPackageName.add(packageName);
      toPush.entries = {
        ...toPush.entries,
        [entryType]: new ChangelogUpdateEntry(
          entryType,
          [...(existingForEntry?.lines ?? []), c.conventional],
          opts.lineFormatter,
        ),
      };
    }

    out.push(toPush);
  }

  // there might be a case where there are more bumps than there are conventionals commits.
  // this is typically due to an EXACT or forceAll release.
  // we need to go through and add changelogs for these additional packages
  for (const bump of opts.bumps) {
    if (processedConventionalForPackageName.has(bump.packageInfo.name)) continue;

    out.push(
      new ChangelogUpdate(getFormattedChangelogDate(), bump, {
        [ChangelogEntryType.MISC]: new ChangelogUpdateEntry(
          ChangelogEntryType.MISC,
          [
            new GitConventional({
              body: null,
              breaking: bump.type === BumpType.MAJOR || bump.type === BumpType.EXACT,
              footer: null,
              header:
                bump.type === BumpType.EXACT ? `Version bumped exactly to ${bump.to}` : `Version bump forced for all`,
              mentions: [],
              merge: null,
              notes: [],
              sha: '',
            }),
          ],
          opts.lineFormatter,
        ),
      }),
    );
  }

  return out;
}
