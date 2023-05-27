/**
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('yargs').Argv} Argv
 * */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import createCLI from 'yargs';
import { hideBin } from 'yargs/helpers';

import { filterPackagesByNames, getPackages } from './getPackages.mjs';
import {
  applyRecommendedBumpsByPackage,
  getChangedFilesSinceBump,
  getChangedPackagesSinceBump,
  getConventionalCommitsByPackage,
  getLastVersionTagsByPackageName,
  getRecommendedBumpsByPackage,
} from './lets-version.mjs';
import { BumpTypeToString } from './types.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns a baseline set of arguments that are applicable to all commands
 * @param {Argv} yargs
 */
const getSharedYargs = yargs =>
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

/**
 * Returns baseline set of arguments that are applicable to all version-specific commands
 * @param {Argv} yargs
 */
const getSharedVersionYargs = yargs =>
  getSharedYargs(yargs)
    .option('package', {
      alias: 'p',
      description: 'One or more packages to check. You can specify multiple by doing -p <name1> -p <name2> -p <name3>',
      type: 'array',
    })
    .option('noFetchTags', {
      default: false,
      description:
        'If true, does not force fetch tags from origin. By default, lets-version will do "git fetch origin --tags --force" to ensure your branch if up-to-date with the tags on origin',
      type: 'boolean',
    });

async function setupCLI() {
  /** @type {PackageJson} */
  const pjson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8'));

  const yargs = createCLI(hideBin(process.argv))
    .scriptName('lets-version')
    .version(pjson.version || '')

    .command(
      'ls',
      'Shows all detected packages for this repository',
      y => getSharedYargs(y),
      async args => {
        const packages = await filterPackagesByNames(await getPackages(args.cwd), undefined, args.cwd);

        if (args.json) return console.info(JSON.stringify(packages, null, 2));

        if (!packages.length) return console.warn('No packages were detected');

        return console.info(packages.map(p => p.packagePath).join(os.EOL));
      },
    )
    .command(
      'last-version-tag',
      'Gets the last tag used when version bumping for a specific package. If no package is specified, all found tags for each package detected are returned',
      y => getSharedVersionYargs(y),
      async args => {
        // @ts-ignore
        const allResults = await getLastVersionTagsByPackageName(args.package, args.noFetchTags, args.cwd);

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
        // @ts-ignore
        const changedFiles = await getChangedFilesSinceBump(args.package, args.noFetchTags, args.cwd);

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
      y => getSharedVersionYargs(y),
      async args => {
        // @ts-ignore
        const changedPackages = await getChangedPackagesSinceBump(args.package, args.noFetchTags, args.cwd);

        if (args.json) return console.info(JSON.stringify(changedPackages, null, 2));

        if (!changedPackages.length) {
          return console.warn(
            'No files have changed. This likely means you have not yet created your first version with the lets-version library, or no changes have occurred since the last version bump.',
          );
        }
        return console.info(changedPackages.map(p => p.packagePath).join(os.EOL));
      },
    )
    .command(
      'get-conventional-since-bump',
      'Parsed git commits for a specific package or packages, using the official Conventional Commits parser',
      y => getSharedVersionYargs(y),
      async args => {
        const commits = await getConventionalCommitsByPackage(args.package, args.cwd);

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
      y => getSharedVersionYargs(y),
      async args => {
        // @ts-ignore
        const bumps = await getRecommendedBumpsByPackage(args.package, args.noFetchTags, args.cwd);

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
      'Gets a series of recommended version bumps for a specific package or set of packages, applies the version bumps, and updates all repository dependents to match the version that has been updated',
      y =>
        getSharedVersionYargs(y)
          .option('yes', {
            alias: 'y',
            default: false,
            description: 'If true, skips any confirmation prompts. Useful if you need to automate this process in CI',
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
          }),
      async args => {
        // @ts-ignore
        await applyRecommendedBumpsByPackage(
          args.package,
          args.noFetchTags,
          { updateOptional: args.updateOptional, updatePeer: args.updatePeer, yes: args.yes },
          args.cwd,
        );
      },
    )
    .help();
  const { _ } = await yargs.argv;

  if (!_.length) return yargs.showHelp();
}

setupCLI();
