/**
 * @typedef {import('./types.mjs').PackageInfo} PackageInfo
 * @typedef {import('./types.mjs').BumpRecommendation} BumpRecommendation
 * @typedef {import('./types.mjs').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo
 */

import dayjs from 'dayjs';

import { conventionalCommitToBumpType } from './parser.mjs';
import {
  BumpType,
  ChangelogEntryType,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  ConventionalCommitType,
} from './types.mjs';

/**
 * @typedef {Object} GenerateChangelogOpts
 * @property {BumpRecommendation[]} bumps
 * @property {GitCommitWithConventionalAndPackageInfo[]} conventional
 */

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
  for (const c of opts.conventional) {
    const existing = conventionalByPackageName.get(c.packageInfo.name) ?? [];
    conventionalByPackageName.set(c.packageInfo.name, [...existing, c]);
  }

  /** @type {ChangelogUpdate[]} */
  const out = [];

  const formattedDate = dayjs().format('YYYY-MM-DD');

  for (const [packageName, commits] of conventionalByPackageName.entries()) {
    const bumpRecommendation = bumpsByPackageName.get(packageName);
    if (!bumpRecommendation) {
      throw new Error(
        `Unable to getChangelogUpdateForPackageInfo because ${packageName} was not found in the bumpsByPackageName map`,
      );
    }

    const toPush = new ChangelogUpdate(formattedDate, bumpRecommendation, {});
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

      toPush.entries = {
        ...toPush.entries,
        [entryType]: new ChangelogUpdateEntry(entryType, [...(existingForEntry?.lines ?? []), c.conventional]),
      };
    }

    out.push(toPush);
  }

  return out;
}
