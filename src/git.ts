import appRootPath from 'app-root-path';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { fixCWD } from './cwd.js';
import { exec } from './exec.js';
import { parseToConventional } from './parser.js';
import { GitCommit, GitCommitWithConventionalAndPackageInfo, PackageInfo, PublishTagInfo } from './types.js';
import { chunkArray } from './util.js';

let didFetchAll = false;
/**
 * Fetches all tracking information from origin.
 * Most importantly, this tries to detect whether we're currently
 * in a shallow clone.
 */
export async function gitFetchAll(cwd = appRootPath.toString()) {
  if (didFetchAll) return;

  const fixedCWD = fixCWD(cwd);

  let isShallow = false;
  const stat = fs.statSync(path.join(fixedCWD, '.git', 'shallow'), { throwIfNoEntry: false });
  isShallow = stat?.isFile() ?? false;

  if (isShallow) {
    console.warn(
      `Current git repository is a **SHALLOW CLONE**. Limited git history may be available, which may result in "lets-version" version bump failures due to missing or incomplete git history.`,
    );
  }

  await exec('git fetch origin', { cwd: fixedCWD, stdio: 'ignore' });
  didFetchAll = true;
}

let didFetchAllTags = false;
/**
 * Pulls in all tags from origin and forces local to be updated
 */
export async function gitFetchAllTags(cwd = appRootPath.toString()) {
  if (didFetchAllTags) return;

  const fixedCWD = fixCWD(cwd);

  await exec('git fetch origin --tags --force', { cwd: fixedCWD, stdio: 'ignore' });
  didFetchAllTags = true;
}

export interface GitCommitsSinceOpts {
  commitDateFormat?: string;
  cwd?: string;
  since?: string;
  relPath?: string;
}
/**
 * Returns commits since a particular git SHA or tag.
 * If the "since" parameter isn't provided, all commits
 * from the dawn of man are returned
 */
export async function gitCommitsSince(opts?: GitCommitsSinceOpts): Promise<GitCommit[]> {
  const { cwd = appRootPath.toString(), commitDateFormat = 'iso-strict', relPath = '', since = '' } = opts ?? {};
  const fixedCWD = fixCWD(cwd);

  let cmd = 'git --no-pager log';

  const DELIMITER = '~~~***~~~';
  const LINE_DELIMITER = '====----====++++====';

  cmd += ` --format=${DELIMITER}%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ad${DELIMITER}%B${LINE_DELIMITER}`;
  if (commitDateFormat) cmd += ` --date=${commitDateFormat}`;
  if (since) cmd += ` ${since}..`;
  if (relPath) cmd += ` -- ${relPath}`;

  const stdout = await exec(cmd, { cwd: fixedCWD, stdio: 'pipe' });

  return (
    stdout
      ?.split(LINE_DELIMITER)
      .filter(Boolean)
      .map(line => {
        const trimmed = line.trim();

        const [sha = '', author = '', email = '', date = '', message = ''] = trimmed.split(DELIMITER).filter(Boolean);
        return new GitCommit(author, date, email, message, sha);
      })
      .filter(commit => Boolean(commit.sha)) ?? []
  );
}

let remoteTagsCache: Array<[string, string]> | null = null;

/**
 * Grabs the full list of all tags available on upstream
 */
export async function gitRemoteTags(cwd = appRootPath.toString()): Promise<Array<[string, string]>> {
  debugger;
  if (remoteTagsCache) return remoteTagsCache;

  const fixedCWD = fixCWD(cwd);

  // since this function may be called multiple times in a workflow,
  // we want to avoid accidentally getting different results
  remoteTagsCache =
    (await exec('git ls-remote --tags origin', { cwd: fixedCWD, stdio: 'pipe' }))
      ?.trim()
      .split(os.EOL)
      .filter(Boolean)
      .map(t => {
        const [sha = '', ref = ''] = t.split(/\s+/);

        return [ref.replace('refs/tags/', ''), sha];
      }) ?? null;

  return remoteTagsCache ?? [];
}

let localTagsCache: Array<[string, string]> | null = null;
/**
 * Grabs the full list of all tags available locally
 */
export async function gitLocalTags(cwd = appRootPath.toString()): Promise<Array<[string, string]>> {
  if (localTagsCache) return localTagsCache;

  const fixedCWD = fixCWD(cwd);

  try {
    // since this function may be called multiple times in a workflow,
    // we want to avoid accidentally getting different results
    localTagsCache =
      (await exec('git show-ref --tags', { cwd: fixedCWD, stdio: 'pipe' }))
        .trim()
        .split(os.EOL)
        .filter(Boolean)
        .map(t => {
          const [sha = '', ref = ''] = t.split(/\s+/);

          return [ref.replace('refs/tags/', ''), sha];
        }) ?? null;

    return localTagsCache ?? [];
  } catch {
    return [];
  }
}

/**
 * Given a package info object, returns a formatted string
 * that can be safely used as a git version tag
 */
export function formatVersionTagForPackage(packageInfo: PackageInfo): string {
  return `${packageInfo.name}@${packageInfo.version}`;
}

/**
 * Given a javascript package info object, checks to see if there's
 * a git tag for its current version. If it's found, its SHA is returned.
 * If one for the current version is not found, all existing tags are scanned
 * to find the closest match, and that is returned. If one isn't found, null
 * is returned.
 */
export async function gitLastKnownPublishTagInfoForPackage(
  packageInfo: PackageInfo,
  cwd = appRootPath.toString(),
): Promise<PublishTagInfo | null> {
  debugger;
  const fixedCWD = fixCWD(cwd);

  // tag may either be on upstream or local-only. We need to treat both cases as "exists"
  const [allRemoteTag, allLocalTags] = await Promise.all([gitRemoteTags(fixedCWD), gitLocalTags(fixedCWD)]);

  // newest / largest tags first
  const allTags = [...(allRemoteTag ?? []), ...(allLocalTags ?? [])].sort((a, b) => b[0].localeCompare(a[0]));

  const allRemoteTagsMap = new Map(allTags);

  let tag = formatVersionTagForPackage(packageInfo);
  let match = allRemoteTagsMap.get(tag);
  if (!match) {
    // no dice on a tag match for the latest posted version in the package.json file.
    // we now need to scan through all tags and find the "closest" semver match

    /** @type {string | null} */
    let largestTag = null;
    for (const tag of allRemoteTagsMap.keys()) {
      if (tag.includes(packageInfo.name)) {
        if (!largestTag) {
          largestTag = tag;
          continue;
        }

        const tagSemver = semver.coerce(tag);
        const largestTagSemver = semver.coerce(largestTag);

        if (!tagSemver || !largestTagSemver) continue;

        if (tagSemver.compare(largestTagSemver) > 0) largestTag = tag;
      }
    }
    if (largestTag) {
      tag = formatVersionTagForPackage({ ...packageInfo, version: semver.coerce(largestTag)?.version ?? '' });
      match = allRemoteTagsMap.get(tag);
    }
  }
  return match ? new PublishTagInfo(packageInfo.name, tag, match) : null;
}

/**
 * Checks to see if there is a Git tag used for the last publish for a list of packages
 */
export async function getLastKnownPublishTagInfoForAllPackages(
  packages: PackageInfo[],
  noFetchTags: boolean,
  cwd = appRootPath.toString(),
): Promise<PublishTagInfo[]> {
  const fixedCWD = fixCWD(cwd);

  if (!noFetchTags) gitFetchAllTags(fixedCWD);

  // warm up the tags cache
  gitRemoteTags(fixedCWD);
  gitLocalTags(fixedCWD);

  return Promise.all(
    packages.map(async p => {
      const result = await gitLastKnownPublishTagInfoForPackage(p, fixedCWD);

      return new PublishTagInfo(p.name, result?.tag ?? null, result?.sha ?? null);
    }),
  );
}

/**
 * Given a specific git sha, finds all files that have been modified
 * since the sha and returns the absolute filepaths
 */
export async function gitAllFilesChangedSinceSha(sha: string, cwd = appRootPath.toString()): Promise<string[]> {
  const fixedCWD = fixCWD(cwd);

  const stdout = await exec(`git --no-pager diff --name-only ${sha}..`, { cwd: fixedCWD, stdio: 'pipe' });
  return (
    stdout
      ?.trim()
      .split(os.EOL)
      .filter(Boolean)
      .map(fp => path.resolve(path.join(cwd, fp))) ?? []
  );
}

/**
 * Given an input of parsed git tag infos,
 * returns all the files that have changed since any of these git tags
 * have occured, with duplicates removed
 */
export async function getAllFilesChangedSinceTagInfos(
  filteredPackages: PackageInfo[],
  tagInfos: PublishTagInfo[],
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);

  const packageNameLookup = new Map(filteredPackages.map(p => [p.name, p]));

  const results = (
    await Promise.all(
      tagInfos.map(async t => {
        if (!t.sha) return [];
        const pkg = packageNameLookup.get(t.packageName);
        const results = await gitAllFilesChangedSinceSha(t.sha, fixedCWD);

        // This should never happen, but
        // we'll guard just to silence the compiler
        if (!pkg) return results;

        return results.filter(fp => fp.startsWith(pkg.packagePath));
      }),
    )
  ).flat();

  return Array.from(new Set(results));
}

/**
 * Given an input of the "main" branch name,
 * returns all the files that have changed since the current branch was created
 */
export async function getAllFilesChangedSinceBranch(
  filteredPackages: PackageInfo[],
  branch: string,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);
  const allFiles = await gitAllFilesChangedSinceSha(branch, fixedCWD);

  const results = filteredPackages
    .map(pkg => {
      return allFiles.filter(fp => fp.startsWith(pkg.packagePath));
    })
    .flat();

  return Array.from(new Set(results));
}

interface GitConventionalForPackageOpts extends GitCommitsSinceOpts {
  noFetchAll?: boolean;
  packageInfo: PackageInfo;
}
/**
 * Gets full git commit, with conventional commits parsed data,
 * for a single, parsed package info
 */
export async function gitConventionalForPackage(
  opts: GitConventionalForPackageOpts,
): Promise<GitCommitWithConventionalAndPackageInfo[]> {
  const { packageInfo, noFetchAll = false, cwd = appRootPath.toString(), ...rest } = opts;
  const fixedCWD = fixCWD(cwd);

  if (!noFetchAll) gitFetchAll(fixedCWD);
  const taginfo = await gitLastKnownPublishTagInfoForPackage(packageInfo, fixedCWD);
  const relPackagePath = path.relative(cwd, packageInfo.packagePath);

  // in a prior version of lets-version, we used to error out if there wasn't a previous publish at all,
  // which wasn't great, as it meant that you needed at least one publish to use this library in your repo.
  // now, we take the first commit in the repo (it's the default behavior) and let the process continue

  const results = await gitCommitsSince({
    ...rest,
    cwd: fixedCWD,
    relPath: relPackagePath,
    since: taginfo?.sha ?? undefined,
  });
  const conventional = parseToConventional(results);

  return conventional.map(
    c =>
      new GitCommitWithConventionalAndPackageInfo(
        c.author,
        c.date,
        c.email,
        c.message,
        c.sha,
        c.conventional,
        packageInfo,
      ),
  );
}

/**
 * Gets full git commit, with conventional commits parsed data,
 * for all provided packages
 */
export async function gitConventionalForAllPackages(
  opts: Omit<GitConventionalForPackageOpts, 'packageInfo'> & { packageInfos: PackageInfo[] },
): Promise<GitCommitWithConventionalAndPackageInfo[]> {
  const { packageInfos, noFetchAll = false, cwd = appRootPath.toString(), ...rest } = opts;
  const fixedCWD = fixCWD(cwd);

  return (
    await Promise.all(
      packageInfos.map(async p =>
        gitConventionalForPackage({
          ...rest,
          cwd: fixedCWD,
          noFetchAll,
          packageInfo: p,
        }),
      ),
    )
  ).flat();
}

/**
 * Creates a git commit, based on whatever changes are active
 */
export async function gitCommit(header: string, body?: string, footer?: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // add files silently
  await exec('git add .', { cwd, stdio: 'ignore' });

  let message = header;
  if (body) message += `${os.EOL}${os.EOL}${body}`;
  if (footer) message += `${os.EOL}${os.EOL}${footer}`;

  // write temp file to use as the git commit message
  const tempFilePath = path.join(os.tmpdir(), '__lets-version-commit-msg__');
  await fs.ensureFile(tempFilePath);
  await fs.writeFile(tempFilePath, message, 'utf-8');

  // commit silently
  await exec(`git commit -F ${tempFilePath} --no-verify`, { cwd: fixedCWD, stdio: 'ignore' });

  // remove the commit msg file
  await fs.remove(tempFilePath);
}

async function gitCurrentBranchName(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const result = await exec('git rev-parse --abbrev-ref HEAD', { cwd: fixedCWD, stdio: 'pipe' });

  return result.trim();
}

/**
 * as the name of this function insists, this
 * function will auto push the current branch, using the current
 * branch name, to origin if it doesn't already exist there.
 */
async function gitEnsureBranchExistsOnOrigin(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const currentBranchName = await gitCurrentBranchName(cwd);
  if (!currentBranchName) {
    throw new Error(
      "gitEnsureBranchExistsOnOrigin() failed because your repository's current branch name could not be properly computed. this is a bug 🐛",
    );
  }

  // this command will return with *something*, not an empty response, if the branch exists on upstream
  const branchExistsOnUpstream = Boolean(
    (
      await exec(`git ls-remote --heads origin ${currentBranchName}`, {
        cwd: fixedCWD,
        stdio: 'pipe',
      })
    ).trim(),
  );

  if (!branchExistsOnUpstream) {
    await exec(`git push --set-upstream origin ${currentBranchName}`, { cwd: fixedCWD, stdio: 'inherit' });
  }

  return currentBranchName;
}

/**
 * Pushes current local changes to upstream / origin
 */
export async function gitPush(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await gitEnsureBranchExistsOnOrigin(cwd);
  await exec('git push --no-verify', { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Git pushes a single tag to upstream / origin
 */
export async function gitPushTag(tag: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await gitEnsureBranchExistsOnOrigin(cwd);
  await exec(`git push origin ${tag} --no-verify`, { cwd: fixedCWD, stdio: 'inherit' });
}

/**
 * Git pushes multiple tags at the same time
 */
export async function gitPushTags(tags: string[], cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  // only push 5 at a time
  const chunkedTags = chunkArray(tags);

  for (const chunk of chunkedTags) {
    await Promise.all(chunk.map(async tag => gitPushTag(tag, fixedCWD)));
  }
}

/**
 * Creates a git tag
 */
export async function gitTag(tag: string, cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  await exec(`git tag ${tag}`, { cwd: fixedCWD, stdio: 'ignore' });
}

/**
 * Checks the current repo to see if there are any outstanding changes
 *
 * @param {string} [cwd=appRootPath.toString()]
 *
 * @returns {Promise<boolean>}
 */
export async function gitWorkdirUnclean(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const statusResult = (await exec('git status -s', { cwd: fixedCWD, stdio: 'pipe' })).trim() ?? '';

  // split by newlines, just in case
  return statusResult.split(os.EOL).filter(Boolean).length > 0;
}

/**
 * Gets the current shortened commit SHA
 *
 * @param {string} [cwd=appRootPath.toString()]
 */
export async function gitCurrentSHA(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const result = (await exec('git rev-parse --short HEAD', { cwd: fixedCWD, stdio: 'pipe' })).trim() ?? '';

  return result;
}
