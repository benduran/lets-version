#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import createCLI, { ArgumentsCamelCase, Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';

import { fixCWD } from './cwd.js';
import {
  applyRecommendedBumpsByPackage,
  getChangedFilesSinceBranch,
  getChangedFilesSinceBump,
  getChangedPackagesSinceBranch,
  getChangedPackagesSinceBump,
  getConventionalCommitsByPackage,
  getLastVersionTagsByPackageName,
  getRecommendedBumpsByPackage,
  listPackages,
  localDepGraph,
} from './lets-version.js';
import { BumpTypeToString, LocalDependencyGraphNode, PackageInfo, ReleaseAsPresets } from './types.js';
import { indentStr } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns a baseline set of arguments that are applicable to all commands
 */
const getSharedYargs = (yargs: Argv) =>
  yargs
    .option('cwd', {
      default: process.cwd(),
      description: "The folder to use as root when running command. Defaults to your session's CWD",
      type: 'string',
    })
    .option('json', {
      default: false,
      description: 'If true, lists results as a JSON blob piped to your terminal',
      type: 'boolean',
    });

type GetSharedYargsType = ArgumentsCamelCase<{ cwd: string; json: boolean }>;

/**
 * Returns baseline set of arguments that are applicable to all version-specific commands
 */
const getSharedVersionYargs = (yargs: Argv) =>
  getSharedYargs(yargs)
    .option('package', {
      alias: 'p',
      description: 'One or more packages to check. You can specify multiple by doing -p <name1> -p <name2> -p <name3>',
      type: 'array',
      string: true,
    })
    .option('noFetchAll', {
      default: false,
      description: 'If true, will not fetch information from remote via "git fetch origin"',
      type: 'boolean',
    })
    .option('noFetchTags', {
      default: false,
      description:
        'If true, does not force fetch tags from origin. By default, lets-version will do "git fetch origin --tags --force" to ensure your branch if up-to-date with the tags on origin',
      type: 'boolean',
    });

/**
 * Returns set of CLI arguments for any git-commit-heavy operations
 */
const getGitYargs = (yargs: Argv) =>
  yargs.option('commitDateFormat', {
    default: 'iso-strict',
    description:
      'Formats the date/timestamp returned by any "git log" calls. Supports all of the options available to "git log." For more information on these formats, please consult the official git CLI documentation: https://git-scm.com/docs/git-log#Documentation/git-log.txt---dateltformatgt',
    type: 'string',
  });

type GetGitYargsType = ArgumentsCamelCase<{ commitDateFormat?: string }>;

type GetSharedVersionYargsType = ArgumentsCamelCase<{ package?: string[]; noFetchAll: boolean; noFetchTags: boolean }>;

/**
 * Returns baseline set of arguments that are applicable to all branch-specific commands
 */
const getSharedBranchYargs = (yargs: Argv) =>
  getSharedYargs(yargs)
    .option('branch', {
      alias: 'b',
      default: 'main',
      description: 'Name of the branch to check against.',
      type: 'string',
    })
    .option('package', {
      alias: 'p',
      description: 'One or more packages to check. You can specify multiple by doing -p <name1> -p <name2> -p <name3>',
      type: 'array',
      string: true,
    });

type GetSharedBranchYargsType = ArgumentsCamelCase<{ branch: string; package?: string[] }>;

/**
 * Returns a byName argument
 */
const addByNameYargs = (yargs: Argv) =>
  yargs.option('byName', {
    default: false,
    description:
      'If true and the --json flag has not been set, reports the changed packages by their package.json names, instead of by their relative file paths',
    type: 'boolean',
  });

type AddByNameYargsType = ArgumentsCamelCase<{ byName: boolean }>;

/**
 * Returns baseline set of arguments that are applicable to all bump operation commands
 */
const getSharedBumpArgs = (yargs: Argv) =>
  getSharedVersionYargs(yargs)
    .option('releaseAs', {
      default: 'auto',
      description:
        'Releases each changed package as this release type or as an exact version. "major" "minor" "patch" "alpha" "beta" "auto" or an exact semver version number are allowed.',
      type: 'string',
    })
    .option('preid', {
      description:
        'The "prerelease identifier" to use as a prefix for the "prerelease" part of a semver. Like the rc in 1.2.0-rc.8. If this is specified, a bump type of "prerelease" will always take place, causing any "--releaseAs" setting to be ignored.',
      type: 'string',
    })
    .option('uniqify', {
      default: false,
      description:
        'If true, will append the git SHA at version bump time to the end of the version number (while maintaining valid semver)',
      type: 'boolean',
    })
    .option('forceAll', {
      default: false,
      deprecate: 'Use --force instead',
      description:
        'If true, forces all packages to receive a bump update, regardless of whether they have changed. What this means, in practice, is that any package that would not normally be changed will receive a PATCH update (or an equivalent if --preid is set)',
      type: 'boolean',
    })
    .option('force', {
      default: false,
      description:
        'If true, forces all packages to receive a bump update, regardless of whether they have changed. What this means, in practice, is that any package that would not normally be changed will receive a PATCH update (or an equivalent if --preid is set)',
      type: 'boolean',
    })
    .option('updatePeer', {
      default: false,
      description: 'If true, will update any dependent "package.json#peerDependencies" fields',
      type: 'boolean',
    })
    .option('updateOptional', {
      default: false,
      description: 'If true, will update any dependent "package.json#optionalDependencies" fields',
      type: 'boolean',
    });

type GetSharedBumpArgsType = ArgumentsCamelCase<{
  releaseAs: string;
  preid?: string;
  uniqify: boolean;
  force: boolean;
  forceAll: boolean;
  updatePeer: boolean;
  updateOptional: boolean;
}>;

type ApplyBumpsArgsType = ArgumentsCamelCase<{
  saveExact?: boolean;
  allowUncommitted?: boolean;
  dryRun?: boolean;
  rollupChangelog?: boolean;
  noChangelog?: boolean;
  noCommit?: boolean;
  noInstall?: boolean;
  noPush?: boolean;
  yes?: boolean;
}>;

/**
 * Prints package changes based on input parameters
 */
const reportChangedPackages = (changedPackages: PackageInfo[], byName: boolean, cwd: string) => {
  return changedPackages.forEach(p => {
    let changedStr = '';
    if (byName) changedStr = `${p.name}${os.EOL}`;
    else {
      const relPackagePath = path.relative(fixCWD(cwd), p.packagePath);
      changedStr = `./${relPackagePath}${os.EOL}`;
    }
    p.filesChanged?.forEach(fp => {
      changedStr += `  ${fp}${os.EOL}`;
    });

    console.info(changedStr);
  });
};

async function setupCLI() {
  /** @type {PackageJson} */
  const pjson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8'));

  let currentCommand = '';

  const yargs = createCLI(hideBin(process.argv))
    .scriptName('lets-version')
    .version(pjson.version || '')
    .middleware(argv => {
      currentCommand = String(argv._[0] || '');
    })
    .fail((msg, err) => {
      /**
       * We won't let yargs print the help message when failure occurs,
       * but we still want to surface the actual error, so we'll do so,
       * but with a generic error code of 1
       */
      console.error(`lets-version ${currentCommand} failed`);
      console.error(err);
      // @ts-ignore
      process.exit(err.status || 1);
    })
    .command(
      'ls',
      'Lists all detected packages for this repository',
      y => getSharedYargs(y),
      async args => {
        const packages = await listPackages(args);

        if (args.json) return console.info(JSON.stringify(packages, null, 2));

        if (!packages.length) return console.warn('No packages were detected');

        return console.info(packages.map(p => p.packagePath).join(os.EOL));
      },
    )
    .command(
      'local-dep-graph',
      'Builds a local repository-only dependency graph. If you are in a monorepo, this is useful to visualize how the dependencies in said monorepo relate to each other.',
      y => getSharedYargs(y),
      async args => {
        const nodes = await localDepGraph(args.cwd);

        if (args.json) return console.info(JSON.stringify(nodes, null, 2));

        if (!nodes.length) return console.warn('No packages were detected');

        const printGraph = (node: LocalDependencyGraphNode, depth: number) => {
          let prefix = `${node.name}@${node.version}`;
          let suffix = ` - depType: ${node.depType}`;

          if (depth <= 0) {
            prefix = chalk.blue(prefix);
            suffix = chalk.blue(suffix);
          }

          console.info(indentStr(`${prefix}${suffix}`, '-', depth));
          for (const childNode of node.deps) printGraph(childNode, depth + 2);
        };
        for (const node of nodes) printGraph(node, 0);
      },
    )
    .command(
      'last-version-tag',
      'Gets the last tag used when version bumping for a specific package. If no package is specified, all found tags for each package detected are returned',
      y => getSharedVersionYargs(y),
      async args => {
        const allResults = await getLastVersionTagsByPackageName({
          cwd: args.cwd,
          names: args.package as string[],
          noFetchTags: args.noFetchTags,
        });

        if (args.json) return console.info(JSON.stringify(allResults, null, 2));

        if (!allResults.length) return console.warn('No existing publish tags were found for your arguments');
        return console.info(
          allResults
            .map(r => `${r.packageName}:${os.EOL}  tag: ${r.tag}${os.EOL}  sha: ${r.sha}`)
            .join(`${os.EOL}${os.EOL}`),
        );
      },
    )
    .command(
      'changed-files-since-bump',
      'Gets a list of all files that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.',
      y => getSharedVersionYargs(y),
      async args => {
        const changedFiles = await getChangedFilesSinceBump({
          cwd: args.cwd,
          names: args.package as string[],
          noFetchTags: args.noFetchTags,
        });

        if (args.json) return console.info(JSON.stringify(changedFiles, null, 2));

        if (!changedFiles.length) {
          return console.warn(
            'No files have changed. This likely means you have not yet created your first version with the lets-version library, or no changes have occurred since the last version bump.',
          );
        }
        return console.info(changedFiles.join(os.EOL));
      },
    )
    .command(
      'changed-packages-since-bump',
      'Gets a list of all packages that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.',
      // @ts-ignore
      y => addByNameYargs(getSharedVersionYargs(y)),
      async (args: AddByNameYargsType & GetSharedVersionYargsType & GetSharedYargsType) => {
        const changedPackages = await getChangedPackagesSinceBump({
          cwd: args.cwd,
          names: args.package,
          noFetchTags: args.noFetchTags,
        });

        if (args.json) return console.info(JSON.stringify(changedPackages, null, 2));

        if (!changedPackages.length) {
          return console.warn(
            'No files have changed. This likely means you have not yet created your first version with the lets-version library, or no changes have occurred since the last version bump.',
          );
        }
        return reportChangedPackages(changedPackages, args.byName, args.cwd);
      },
    )
    .command(
      'get-conventional-since-bump',
      'Parsed git commits for a specific package or packages, using the official Conventional Commits parser',
      // @ts-ignore
      y => getSharedVersionYargs(getGitYargs(y)),
      async (args: GetGitYargsType & GetSharedBranchYargsType & GetSharedYargsType) => {
        const commits = await getConventionalCommitsByPackage({
          commitDateFormat: args.commitDateFormat,
          cwd: args.cwd,
          names: args.package as string[],
        });

        if (args.json) return console.info(JSON.stringify(commits, null, 2));

        if (!commits.length) {
          return console.warn('No conventional commits could be parsed');
        }

        return console.info(
          commits
            .map(
              c =>
                `package: ${c.packageInfo.name}${os.EOL}  message: ${c.message}  commit: ${c.sha}${os.EOL}  author: ${c.author}${os.EOL}  email: ${c.email}${os.EOL}  date: ${c.date}${os.EOL}`,
            )
            .join(`${os.EOL}${os.EOL}`),
        );
      },
    )
    .command(
      'get-bumps',
      'Gets a series of recommended version bumps for a specific package or set of packages. NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.',
      // @ts-ignore
      y => getSharedYargs(getSharedBumpArgs(getGitYargs(y))),
      async (args: GetSharedYargsType & GetSharedBumpArgsType & GetSharedVersionYargsType & GetGitYargsType) => {
        const { bumps } = await getRecommendedBumpsByPackage({
          commitDateFormat: args.commitDateFormat,
          cwd: args.cwd,
          force: args.forceAll || args.force,
          names: args.package as string[],
          noFetchAll: args.noFetchAll,
          noFetchTags: args.noFetchTags,
          preid: args.preid,
          releaseAs: args.releaseAs as ReleaseAsPresets,
          uniqify: args.uniqify,
          updateOptional: args.updateOptional,
          updatePeer: args.updatePeer,
        });

        if (args.json) return console.info(JSON.stringify(bumps, null, 2));

        if (!bumps.length) {
          return console.warn(
            'No bumps can be applied. This likely means you have not yet created your first version with the lets-version library, or no changes have occurred since the last version bump.',
          );
        }

        return console.info(
          bumps
            .map(
              b =>
                `package: ${b.packageInfo.name}${os.EOL}  bump: ${
                  b.from ? `${b.from} -> ${b.to}` : `First time -> ${b.to}`
                }${os.EOL}  type: ${BumpTypeToString[b.type]}${os.EOL}  valid: ${b.isValid}`,
            )
            .join(`${os.EOL}${os.EOL}`),
        );
      },
    )
    .command(
      'apply-bumps',
      'Gets a series of recommended version bumps for a specific package or set of packages, applies the version bumps, and updates all repository dependents to match the version that has been updated.',
      // @ts-ignore
      y =>
        getSharedBumpArgs(getGitYargs(y))
          .option('saveExact', {
            default: false,
            description:
              "If true, saved dependencies will be configured with an exact version rather than using npm's default semver range operator",
            type: 'boolean',
          })
          .option('allowUncommitted', {
            default: false,
            description:
              'If true, will allow the version operation to continue when there are uncommitted files in the repo at version bump time. This is usefull if you have some scripts that need to run after version bumps are performed, but potentially before you issue a git commit and subsequent npm publish operation.',
            type: 'boolean',
          })
          .option('dryRun', {
            default: false,
            description:
              'If true, will print the changes that are expected to happen at every step instead of actually writing the changes',
            type: 'boolean',
          })
          .option('rollupChangelog', {
            default: false,
            description:
              'If true, in addition to updating changelog files for all packages that will be bumped, creates a "rollup" CHANGELOG.md at the root of the repo that contains an aggregate of changes',
            type: 'boolean',
          })
          .option('noChangelog', {
            default: false,
            description: 'If true, will not write CHANGELOG.md updates for each package that has changed',
            type: 'boolean',
          })
          .option('noCommit', {
            default: false,
            description:
              'If true, will modify all required files but leave them uncommitted after all operations have completed. This will also prevent a git push from occurring',
            type: 'boolean',
          })
          .option('noInstall', {
            default: false,
            description: `If true, will skip running "npm install" or your package manager's equivalent install after applying the bumps`,
            type: 'boolean',
          })
          .option('noPush', {
            default: false,
            description: 'If true, will not push changes and tags to origin',
            type: 'boolean',
          })
          .option('yes', {
            alias: 'y',
            default: false,
            description: 'If true, skips any confirmation prompts. Useful if you need to automate this process in CI',
            type: 'boolean',
          }),
      async (
        args: GetGitYargsType &
          GetSharedVersionYargsType &
          GetSharedBranchYargsType &
          GetSharedYargsType &
          GetSharedBumpArgsType &
          ApplyBumpsArgsType,
      ) => {
        await applyRecommendedBumpsByPackage({
          allowUncommitted: args.allowUncommitted,
          commitDateFormat: args.commitDateFormat,
          cwd: args.cwd,
          dryRun: args.dryRun,
          force: args.forceAll || args.force,
          names: args.package,
          noChangelog: args.noChangelog,
          noCommit: args.noCommit,
          noFetchAll: args.noFetchAll,
          noFetchTags: args.noFetchTags,
          noInstall: args.noInstall,
          noPush: args.noPush,
          preid: args.preid,
          releaseAs: args.releaseAs as ReleaseAsPresets,
          rollupChangelog: args.rollupChangelog,
          uniqify: args.uniqify,
          saveExact: args.saveExact,
          updateOptional: args.updateOptional,
          updatePeer: args.updatePeer,
          yes: args.yes,
        });
      },
    )
    .command(
      'changed-files-since-branch',
      'Gets a list of all files that have changed in the current branch.',
      y => getSharedBranchYargs(y),
      async args => {
        const changedFiles = await getChangedFilesSinceBranch({
          cwd: args.cwd,
          names: args.package,
          branch: args.branch,
        });

        if (args.json) return console.info(JSON.stringify(changedFiles, null, 2));

        if (!changedFiles.length) {
          return console.warn(
            'No files have changed. This likely means no changes have occurred since the branch was created.',
          );
        }
        return console.info(changedFiles.join(os.EOL));
      },
    )
    .command(
      'changed-packages-since-branch',
      'Gets a list of all packages that have changed in the current branch.',
      // @ts-ignore
      y => addByNameYargs(getSharedBranchYargs(y)),
      async (args: GetSharedYargsType & AddByNameYargsType & GetSharedBranchYargsType) => {
        const changedPackages = await getChangedPackagesSinceBranch({
          cwd: args.cwd,
          names: args.package,
          branch: args.branch,
        });

        if (args.json) return console.info(JSON.stringify(changedPackages, null, 2));

        if (!changedPackages.length) {
          return console.warn(
            'No files have changed. This likely means no changes have occurred since the branch was created.',
          );
        }
        return reportChangedPackages(changedPackages, args.byName, args.cwd);
      },
    )
    .help();
  const { _ } = await yargs.argv;

  if (!_.length) return yargs.showHelp();
}

setupCLI();
