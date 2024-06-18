import dayjs from 'dayjs';

import { conventionalCommitToBumpType } from './parser.js';
import {
  BumpRecommendation,
  BumpType,
  ChangelogEntryType,
  ChangeLogLineFormatter,
  ChangelogUpdate,
  ChangelogUpdateEntry,
  ConventionalCommitType,
  GitCommitWithConventionalAndPackageInfo,
  GitConventional,
} from './types.js';

export function getFormattedChangelogDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export interface GenerateChangelogOpts {
  bumps: BumpRecommendation[];
  commits: GitCommitWithConventionalAndPackageInfo[];
  lineFormatter?: ChangeLogLineFormatter;
}

export async function getChangelogUpdateForPackageInfo(opts: GenerateChangelogOpts): Promise<ChangelogUpdate[]> {
  const bumpsByPackageName = new Map(opts.bumps.map(b => [b.packageInfo.name, b]));

  const conventionalByPackageName = new Map<string, GitCommitWithConventionalAndPackageInfo[]>();
  for (const c of opts.commits) {
    const existing = conventionalByPackageName.get(c.packageInfo.name) ?? [];
    conventionalByPackageName.set(c.packageInfo.name, [...existing, c]);
  }

  const out: ChangelogUpdate[] = [];
  const processedConventionalForPackageName = new Set<string>();

  for (const [packageName, commits] of conventionalByPackageName.entries()) {
    const bumpRecommendation = bumpsByPackageName.get(packageName);
    if (!bumpRecommendation) {
      throw new Error(
        `Unable to getChangelogUpdateForPackageInfo because ${packageName} was not found in the bumpsByPackageName map`,
      );
    }

    const toPush = new ChangelogUpdate(getFormattedChangelogDate(), bumpRecommendation, {});
    for (const c of commits) {
      if (!c.conventional.header) continue;
      const commitBumpType = conventionalCommitToBumpType(c);

      let entryType: ChangelogEntryType;

      if (commitBumpType === BumpType.FIRST || commitBumpType === BumpType.MAJOR)
        entryType = ChangelogEntryType.BREAKING;
      else if (commitBumpType === BumpType.MINOR) entryType = ChangelogEntryType.FEATURES;
      else if (c.conventional.type === ConventionalCommitType.FIX) entryType = ChangelogEntryType.FIXES;
      else if (c.conventional.type === ConventionalCommitType.DOCS) entryType = ChangelogEntryType.DOCS;
      else entryType = ChangelogEntryType.MISC;

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
