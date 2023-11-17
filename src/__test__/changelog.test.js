/** @typedef {import('../types.js').GitCommitWithConventionalAndPackageInfo} GitCommitWithConventionalAndPackageInfo */

import { describe, expect, it } from 'vitest';

import { getChangelogUpdateForPackageInfo } from '../changelog.js';
import { BumpRecommendation, GitCommitWithConventionalAndPackageInfo, GitConventional, PackageInfo } from '../types.js';

describe('changelog.js tests', () => {
  it('Should work with empty data', async () => {
    const changelog = await getChangelogUpdateForPackageInfo({
      bumps: [],
      commits: [],
    });
    expect(changelog).toEqual([]);
  });

  const packageA = new PackageInfo({
    isPrivate: false,
    name: 'packageA',
    packageJSONPath: '/homedir/repo/packages/packageA/package.json',
    packagePath: '/homedir/repo/packages/packageA',
    pkg: {
      name: 'packageA',
      version: '1.0.37',
    },
    root: false,
    version: '1.0.37',
  });

  const packageB = new PackageInfo({
    isPrivate: false,
    name: 'packageB',
    packageJSONPath: '/homedir/repo/packages/packageB/package.json',
    packagePath: '/homedir/repo/packages/packageB',
    pkg: {
      name: 'packageB',
      version: '4.1.2618',
      dependencies: {
        packageA: '^1.0.37',
      },
    },
    root: false,
    version: '4.1.2618',
  });

  const packageC = new PackageInfo({
    isPrivate: false,
    name: 'packageC',
    packageJSONPath: '/homedir/repo/packages/packageC/package.json',
    packagePath: '/homedir/repo/packages/packageC',
    pkg: {
      name: 'packageC',
      version: '2.8.232',
      dependencies: {
        packageB: '^4.1.2618',
      },
    },
    root: false,
    version: '2.8.232',
  });

  const conventionalCommit = new GitConventional({
    sha: '3a245f13ca7d4d19d74d1482dfd27d48dee00e7f',
    author: 'John',
    email: 'john@company.com',
    body: 'this is body message',
    breaking: false,
    footer: null,
    header: 'this is message',
    mentions: [],
    merge: null,
    notes: [],
    scope: null,
    subject: '',
    type: null,
    references: undefined,
    revert: undefined,
  });

  const commit = new GitCommitWithConventionalAndPackageInfo(
    'John',
    'Thu Nov 16 13:27:36 2023 -0800',
    'john@company.com',
    'this is commit message',
    '3a245f13ca7d4d19d74d1482dfd27d48dee00e7f',
    conventionalCommit,
    packageA,
  );

  it('Should work with non-hierarchical commits', async () => {
    const changelog = await getChangelogUpdateForPackageInfo({
      bumps: [
        new BumpRecommendation(packageA, '1.0.36', '1.0.37', 0, undefined),
        new BumpRecommendation(packageB, '4.1.2617', '4.1.2618', 0, undefined),
        new BumpRecommendation(packageC, '2.8.231', '2.8.232', 0, undefined),
      ],
      commits: [commit],
      changelogDependencies: true,
    });
    const messages = changelog.map(changelog => changelog.toString());
    // console.log(JSON.stringify(messages).replaceAll('"', '`'));

    expect(messages).toEqual([
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 4.1.2618 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bump forced for all
`,
      `## 2.8.232 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bump forced for all
`,
    ]);
  });

  it('Should work with hierarchical commits A->B ', async () => {
    const bumpA = new BumpRecommendation(packageA, '1.0.36', '1.0.37', 0, undefined);
    const bumpB = new BumpRecommendation(packageB, '1.0.36', '1.0.37', 0, bumpA);
    const bumpC = new BumpRecommendation(packageC, '1.0.36', '1.0.37', 0, undefined);
    const changelog = await getChangelogUpdateForPackageInfo({
      bumps: [bumpA, bumpB, bumpC],
      commits: [commit],
      changelogDependencies: true,
    });
    const messages = changelog.map(changelog => changelog.toString());
    // console.log(JSON.stringify(messages).replaceAll('"', '`'));

    expect(messages).toEqual([
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bumped because of the changes in the following packages:

#### packageA
##### 1.0.37 (2023-11-17)

###### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bump forced for all
`,
    ]);
  });

  it('Should work with hierarchical commits A->B->C', async () => {
    const bumpA = new BumpRecommendation(packageA, '1.0.36', '1.0.37', 0, undefined);
    const bumpB = new BumpRecommendation(packageB, '1.0.36', '1.0.37', 0, bumpA);
    const bumpC = new BumpRecommendation(packageC, '1.0.36', '1.0.37', 0, bumpB);
    const changelog = await getChangelogUpdateForPackageInfo({
      bumps: [bumpA, bumpB, bumpC],
      commits: [commit],
      changelogDependencies: true,
    });
    const messages = changelog.map(changelog => changelog.toString());
    // console.log(JSON.stringify(messages).replaceAll('"', '`'));

    expect(messages).toEqual([
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bumped because of the changes in the following packages:

#### packageA
##### 1.0.37 (2023-11-17)

###### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bumped because of the changes in the following packages:

#### packageA
##### 1.0.37 (2023-11-17)

###### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
    ]);
  });

  it('Should work with hierarchical commits A->B A->C', async () => {
    const bumpA = new BumpRecommendation(packageA, '1.0.36', '1.0.37', 0, undefined);
    const bumpB = new BumpRecommendation(packageB, '1.0.36', '1.0.37', 0, bumpA);
    const bumpC = new BumpRecommendation(packageC, '1.0.36', '1.0.37', 0, bumpA);
    const changelog = await getChangelogUpdateForPackageInfo({
      bumps: [bumpA, bumpB, bumpC],
      commits: [commit],
      changelogDependencies: true,
    });
    const messages = changelog.map(changelog => changelog.toString());
    // console.log(JSON.stringify(messages).replaceAll('"', '`'));

    expect(messages).toEqual([
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bumped because of the changes in the following packages:

#### packageA
##### 1.0.37 (2023-11-17)

###### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
      `## 1.0.37 (2023-11-17)

### 🔀 Miscellaneous 🔀

- Version bumped because of the changes in the following packages:

#### packageA
##### 1.0.37 (2023-11-17)

###### 🔀 Miscellaneous 🔀

- this is message (3a245f13ca7d4d19d74d1482dfd27d48dee00e7f)
`,
    ]);
  });
});
