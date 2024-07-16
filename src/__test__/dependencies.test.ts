import path from 'node:path';

import fs from 'fs-extra';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

import { getBumpRecommendationForPackageInfo } from '../dependencies.js';
import { getPackages } from '../getPackages.js';
import { gitCurrentSHA } from '../git.js';
import { getSynchronizedBumpsByPackage } from '../lets-version.js';
import {
  BumpRecommendation,
  BumpType,
  GitCommitWithConventionalAndPackageInfo,
  PackageInfo,
  PublishTagInfo,
  ReleaseAsPresets,
} from '../types.js';
import { isPackageJSONDependencyKeySupported } from '../util.js';

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

    const pinfo = packageInfo as PackageInfo;

    // When there is no "from," the bump gets released "as-is," regardless of the bump type
    const bump1 = await getBumpRecommendationForPackageInfo(pinfo, null, BumpType.PATCH, undefined, undefined);
    expect(bump1.from).toBe(null);
    expect(bump1.isValid).toBeTruthy();
    expect(bump1.packageInfo).toBe(pinfo);
    expect(bump1.to).toBe(pinfo.version);
    expect(bump1.type).toBe(BumpType.PATCH);

    // we are validating first release is an "as-is"
    const bump2 = await getBumpRecommendationForPackageInfo(
      pinfo,
      null,
      BumpType.MAJOR,
      undefined,
      undefined,
      undefined,
    );
    expect(bump2.from).toBe(null);
    expect(bump2.isValid).toBeTruthy();
    expect(bump2.packageInfo).toBe(pinfo);
    expect(bump2.to).toBe(pinfo.version);
    expect(bump2.type).toBe(BumpType.MAJOR);

    // prerelease with preid and no prior release should still mark with the pred
    const bump3 = await getBumpRecommendationForPackageInfo(
      pinfo,
      null,
      BumpType.PRERELEASE,
      undefined,
      undefined,
      'beta',
    );
    expect(bump3.from).toBe(pinfo.version);
    expect(bump3.isValid).toBeTruthy();
    expect(bump3.packageInfo).toBe(pinfo);
    expect(bump3.to).toBe(semver.inc(pinfo.version, 'prerelease', undefined, 'beta'));
    expect(bump3.type).toBe(BumpType.PRERELEASE);

    // if a "releaseAs" is provided, we should wholesale ignore the BumpType and it should default to the type of "releaseAs"
    const bump4 = await getBumpRecommendationForPackageInfo(
      pinfo,
      null,
      BumpType.MAJOR,
      undefined,
      ReleaseAsPresets.BETA,
      undefined,
    );
    expect(bump4.from).toBe(pinfo.version);
    expect(bump4.isValid).toBeTruthy();
    expect(bump4.packageInfo).toBe(pinfo);
    expect(bump4.to).toBe(semver.inc(pinfo.version, 'prerelease', undefined, 'beta'));
    expect(bump4.type).toBe(BumpType.PRERELEASE);

    // releaseAs can also be "MAJOR" or "MINOR," etc
    const bump5 = await getBumpRecommendationForPackageInfo(
      pinfo,
      null,
      BumpType.MAJOR,
      undefined,
      ReleaseAsPresets.MINOR,
      undefined,
    );
    expect(bump5.from).toBe(pjson.version);
    expect(bump5.isValid).toBeTruthy();
    expect(bump5.packageInfo).toBe(pinfo);
    expect(bump5.to).toBe(semver.inc(pinfo.version, 'minor'));
    expect(bump5.type).toBe(BumpType.MINOR);

    // releaseAs may also be "exact," which disregards everything and bumps to the exact provided value
    const bump6 = await getBumpRecommendationForPackageInfo(
      pinfo,
      null,
      BumpType.MAJOR,
      undefined,
      '100.1.2',
      undefined,
    );
    expect(bump6.from).toBe(pjson.version);
    expect(bump6.isValid).toBeTruthy();
    expect(bump6.packageInfo).toBe(pinfo);
    expect(bump6.to).toBe('100.1.2');
    expect(bump6.type).toBe(BumpType.EXACT);

    // Package may have already been published, so the "from" should not be null
    const bump7 = await getBumpRecommendationForPackageInfo(
      pinfo,
      pjson.version ?? '',
      BumpType.MAJOR,
      undefined,
      undefined,
      undefined,
    );
    expect(bump7.from).toBe(pjson.version);
    expect(bump7.isValid).toBeTruthy();
    expect(bump7.packageInfo).toBe(pinfo);
    expect(bump7.to).toBe(semver.inc(pjson.version ?? '', 'major'));
    expect(bump7.type).toBe(BumpType.MAJOR);

    // Package may have already been published, so the "from" should not be null
    const bump8 = await getBumpRecommendationForPackageInfo(
      pinfo,
      pjson.version ?? '',
      BumpType.PRERELEASE,
      undefined,
      undefined,
      'bloop',
    );
    expect(bump8.from).toBe(pjson.version);
    expect(bump8.isValid).toBeTruthy();
    expect(bump8.packageInfo).toBe(pinfo);
    expect(bump8.to).toBe(semver.inc(pjson.version ?? '', 'prerelease', undefined, 'bloop'));
    expect(bump8.type).toBe(BumpType.PRERELEASE);

    // Package may have already been published, so the "from" should not be null
    const pjsonWithDifferentVersion = { ...pinfo, version: '4.2.7' };
    const bump9 = await getBumpRecommendationForPackageInfo(
      pjsonWithDifferentVersion,
      pjsonWithDifferentVersion.version,
      BumpType.PRERELEASE,
      undefined,
      ReleaseAsPresets.BETA,
      '',
    );
    expect(bump9.from).toBe(pjsonWithDifferentVersion.version);
    expect(bump9.isValid).toBeTruthy();
    expect(bump9.packageInfo).toBe(pjsonWithDifferentVersion);
    expect(bump9.to).toBe(semver.inc(pjsonWithDifferentVersion.version ?? '', 'prerelease', undefined, 'beta'));
    expect(bump9.type).toBe(BumpType.PRERELEASE);

    const sha = await gitCurrentSHA();
    const bump10 = await getBumpRecommendationForPackageInfo(
      pjsonWithDifferentVersion,
      pjsonWithDifferentVersion.version,
      BumpType.PRERELEASE,
      undefined,
      ReleaseAsPresets.BETA,
      '',
      true,
    );
    expect(bump10.from).toBe(pjsonWithDifferentVersion.version);
    expect(bump10.isValid).toBeTruthy();
    expect(bump10.packageInfo).toBe(pjsonWithDifferentVersion);
    expect(bump10.to).toBe(
      `${semver.inc(pjsonWithDifferentVersion.version ?? '', 'prerelease', undefined, 'beta')}.${sha}`,
    );
    expect(bump10.type).toBe(BumpType.PRERELEASE);
  });

  it('Should return a valid bump recommendation for a monorepo packages', async () => {
    const cwd = path.join(__dirname, 'test1');
    const packages = await getPackages(cwd);

    expect(packages).toBeDefined();

    const bumpTypeByPackageName: Map<string, BumpType> = new Map();
    bumpTypeByPackageName.set('d', BumpType.PATCH);
    const tagsForPackagesMap: Map<string, PublishTagInfo> = new Map();
    const { bumps, packages: updatedPackages } = await getSynchronizedBumpsByPackage(
      { cwd },
      bumpTypeByPackageName,
      packages,
      tagsForPackagesMap,
    );
    expect(bumps).toBeDefined();
    {
      const [d, a, c, b] = bumps as [BumpRecommendation, BumpRecommendation, BumpRecommendation, BumpRecommendation];

      expect(d).toBeDefined();
      expect(d.packageInfo.name).toBe('d');
      expect(d.from).toBe('1.0.0');
      expect(d.to).toBe('1.0.1');
      expect(d.type).toBe(BumpType.PATCH);

      expect(a).toBeDefined();
      expect(a.packageInfo.name).toBe('a');
      expect(a.from).toBe('1.0.0');
      expect(a.to).toBe('1.0.1');
      expect(a.type).toBe(BumpType.PATCH);

      expect(c).toBeDefined();
      expect(c.packageInfo.name).toBe('c');
      expect(c.from).toBe('1.0.0');
      expect(c.to).toBe('1.0.1');
      expect(c.type).toBe(BumpType.PATCH);

      expect(b).toBeDefined();
      expect(b.packageInfo.name).toBe('b');
      expect(b.from).toBe('1.0.0');
      expect(b.to).toBe('1.0.1');
      expect(b.type).toBe(BumpType.PATCH);
    }

    expect(updatedPackages).toBeDefined();
    {
      const [d, a, c, b] = updatedPackages as [PackageInfo, PackageInfo, PackageInfo, PackageInfo];
      expect(d.pkg.name).toBe('d');
      expect(d.pkg.dependencies).toEqual({});

      expect(a.pkg.name).toBe('a');
      expect(a.pkg.dependencies).toEqual({ d: '^1.0.1' });

      expect(c.pkg.name).toBe('c');
      expect(c.pkg.dependencies).toEqual({ a: '^1.0.1', b: '^1.0.1' });

      expect(b.pkg.name).toBe('b');
      expect(b.pkg.dependencies).toEqual({ d: '^1.0.1' });
    }
  });
});
