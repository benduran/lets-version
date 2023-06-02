/** @typedef {import('type-fest').PackageJson} PackageJson */
/** @typedef {import('../types.js').PackageInfo} PackageInfo */

import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

import { getBumpRecommendationForPackageInfo, isPackageJSONDependencyKeySupported } from '../dependencies.js';
import { getPackages } from '../getPackages.js';
import { BumpType, ReleaseAsPresets } from '../types.js';

describe('dependencies.js tests', () => {
  /** @type {PackageJson}  */
  const pjson = {
    ...JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')),
    peerDependencies: {
      chalk: '^5',
    },
    optionalDependencies: {
      react: '^18',
    },
  };

  it('Should only return a sampling of package.json keys that are supported', () => {
    const baseCase = Object.keys(pjson).filter(k => isPackageJSONDependencyKeySupported(k, false, false));
    expect(baseCase.length).toBe(2);

    const peerCase = Object.keys(pjson).filter(k => isPackageJSONDependencyKeySupported(k, true, false));
    expect(peerCase.length).toBe(3);

    const optionalCase = Object.keys(pjson).filter(k => isPackageJSONDependencyKeySupported(k, false, true));
    expect(optionalCase.length).toBe(3);

    const allCase = Object.keys(pjson).filter(k => isPackageJSONDependencyKeySupported(k, true, true));
    expect(allCase.length).toBe(4);
  });

  it('Should return a valid bump recommendation for a parsed package', async () => {
    const [packageInfo] = await getPackages(path.join(__dirname, '../../'));

    expect(packageInfo).toBeDefined();

    /** @type {PackageInfo} */
    // @ts-ignore
    const pinfo = packageInfo;

    // When there is no "from," the bump gets released "as-is," regardless of the bump type
    const bump1 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.PATCH, undefined, undefined);
    expect(bump1.from).toBe(null);
    expect(bump1.isValid).toBeTruthy();
    expect(bump1.packageInfo).toBe(pinfo);
    expect(bump1.to).toBe(pinfo.version);
    expect(bump1.type).toBe(BumpType.PATCH);

    // we are validating first release is an "as-is"
    const bump2 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.MAJOR, undefined, undefined);
    expect(bump2.from).toBe(null);
    expect(bump2.isValid).toBeTruthy();
    expect(bump2.packageInfo).toBe(pinfo);
    expect(bump2.to).toBe(pinfo.version);
    expect(bump2.type).toBe(BumpType.MAJOR);

    // prerelease with preid and no prior release should still mark with the pred
    const bump3 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.PRERELEASE, undefined, 'beta');
    expect(bump3.from).toBe(pinfo.version);
    expect(bump3.isValid).toBeTruthy();
    expect(bump3.packageInfo).toBe(pinfo);
    expect(bump3.to).toBe(semver.inc(pinfo.version, 'prerelease', undefined, 'beta'));
    expect(bump3.type).toBe(BumpType.PRERELEASE);

    // if a "releaseAs" is provided, we should wholesale ignore the BumpType and it should default to the type of "releaseAs"
    const bump4 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.MAJOR, 'beta', undefined);
    expect(bump4.from).toBe(pinfo.version);
    expect(bump4.isValid).toBeTruthy();
    expect(bump4.packageInfo).toBe(pinfo);
    expect(bump4.to).toBe(semver.inc(pinfo.version, 'prerelease', undefined, 'beta'));
    expect(bump4.type).toBe(BumpType.PRERELEASE);

    // releaseAs can also be "MAJOR" or "MINOR," etc
    const bump5 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.MAJOR, ReleaseAsPresets.MINOR, undefined);
    expect(bump5.from).toBe(pjson.version);
    expect(bump5.isValid).toBeTruthy();
    expect(bump5.packageInfo).toBe(pinfo);
    expect(bump5.to).toBe(semver.inc(pinfo.version, 'minor'));
    expect(bump5.type).toBe(BumpType.MINOR);

    // releaseAs may also be "exact," which disregards everything and bumps to the exact provided value
    const bump6 = getBumpRecommendationForPackageInfo(pinfo, null, BumpType.MAJOR, '100.1.2', undefined);
    expect(bump6.from).toBe(pjson.version);
    expect(bump6.isValid).toBeTruthy();
    expect(bump6.packageInfo).toBe(pinfo);
    expect(bump6.to).toBe('100.1.2');
    expect(bump6.type).toBe(BumpType.EXACT);

    // Package may have already been published, so the "from" should not be null
    const bump7 = getBumpRecommendationForPackageInfo(pinfo, pjson.version ?? '', BumpType.MAJOR, undefined, undefined);
    expect(bump7.from).toBe(pjson.version);
    expect(bump7.isValid).toBeTruthy();
    expect(bump7.packageInfo).toBe(pinfo);
    expect(bump7.to).toBe(semver.inc(pjson.version ?? '', 'major'));
    expect(bump7.type).toBe(BumpType.MAJOR);

    // Package may have already been published, so the "from" should not be null
    const bump8 = getBumpRecommendationForPackageInfo(
      pinfo,
      pjson.version ?? '',
      BumpType.PRERELEASE,
      undefined,
      'bloop',
    );
    expect(bump8.from).toBe(pjson.version);
    expect(bump8.isValid).toBeTruthy();
    expect(bump8.packageInfo).toBe(pinfo);
    expect(bump8.to).toBe(semver.inc(pjson.version ?? '', 'prerelease', undefined, 'bloop'));
    expect(bump8.type).toBe(BumpType.PRERELEASE);
  });
});
