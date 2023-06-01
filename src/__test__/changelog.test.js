/** @typedef {import('../changelog.js').GenerateChangelogOpts} GenerateChangelogOpts */
/** @typedef {import('../changelog.js').PackageInfo} PackageInfo */

// @ts-nocheck

import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { getChangelogUpdateForPackageInfo, getFormattedChangelogDate } from '../changelog.js';
import { BumpType, ChangelogEntryType } from '../types.js';
import conventionalData from './data/conventional-single-commit.json';

describe('changelog.js tests', () => {
  it('should return the current date in YYYY-MM-DD format', () => {
    const currentDate = dayjs().format('YYYY-MM-DD');
    const result = getFormattedChangelogDate();

    expect(result).toEqual(currentDate);
  });
  it('should throw an error when there is no bump for a package', async () => {
    /** @type {GenerateChangelogOpts} */
    const opts = {
      bumps: [],
      commits: conventionalData,
    };

    await expect(getChangelogUpdateForPackageInfo(opts)).rejects.toThrowError(
      `Unable to getChangelogUpdateForPackageInfo because ${conventionalData[0].packageInfo.name} was not found in the bumpsByPackageName map`,
    );
  });

  it('should return correct ChangelogUpdate when all data is provided', async () => {
    /** @type {PackageInfo} */
    // @ts-ignore
    const package1Info = conventionalData[0].packageInfo;

    /** @type {GenerateChangelogOpts} */
    const opts = {
      bumps: [
        {
          packageInfo: package1Info,
          type: BumpType.MINOR,
          from: '1.0.0',
          to: '1.1.0',
        },
      ],
      commits: conventionalData,
    };

    const result = await getChangelogUpdateForPackageInfo(opts);

    // Ensure the result is an array
    expect(Array.isArray(result)).toBe(true);
    // Ensure the array length is as expected
    expect(result.length).toBe(1);

    // Validate the properties of the first ChangelogUpdate object
    const [firstUpdate] = result;

    expect(firstUpdate.formattedDate).toEqual(getFormattedChangelogDate());
    expect(firstUpdate.bumpRecommendation).toEqual(opts.bumps[0]);

    expect(firstUpdate.entries[ChangelogEntryType.MISC]).toBeDefined();
    expect(firstUpdate.entries[ChangelogEntryType.MISC].lines.length).toBe(1);
    expect(firstUpdate.entries[ChangelogEntryType.MISC].lines[0]).toEqual(opts.commits[0].conventional);
  });
});
