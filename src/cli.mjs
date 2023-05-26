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
import { getLastKnownPublishTagInfoForAllPackages, gitAllFilesChangedSinceSha } from './git.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns a baseline set of arguments that are applicable to all commands
 * @param {Argv} yargs
 * @returns {Argv}
 */
const getSharedYargs = yargs =>
  yargs.option('cwd', {
    default: process.cwd(),
    description: "The folder to use as root when running command. Defaults to your session's CWD",
    type: 'string',
  });

async function setupCLI() {
  /** @type {PackageJson} */
  const pjson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8'));

  const yargs = createCLI(hideBin(process.argv))
    .version(pjson.version || '')

    .command(
      'ls',
      'Shows all detected packages for this repository',
      y =>
        getSharedYargs(y).option('json', {
          default: false,
          description:
            'If true, lists the detected packages and their information as a JSON blob piped to your terminal',
          type: 'boolean',
        }),
      async args => {
        const packages = await getPackages(args.cwd);
        if (args.json) return console.info(JSON.stringify(packages, null, 2));

        return console.info(packages.map(p => p.packagePath).join(os.EOL));
      },
    )
    .command(
      'last-version-tag',
      'Gets the last tag used when version bumping for a specific package. If no package is specified, all found tags for each package detected are returned',
      y =>
        getSharedYargs(y)
          .option('package', {
            alias: 'p',
            description:
              'One or more packages to check. You can specify multiple by doing -p <name1> -p <name2> -p <name3>',
            type: 'array',
          })
          .option('json', {
            default: false,
            description: 'If true, lists the found git tags for your arguments as a JSON blob piped to your terminal',
            type: 'boolean',
          }),
      async args => {
        const filteredPackages = filterPackagesByNames(await getPackages(args.cwd), args.package);

        if (!filteredPackages) return console.warn('No packages were found that match your arguments');

        const allResults = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, args.cwd);

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
      y =>
        getSharedYargs(y)
          .option('package', {
            alias: 'p',
            description:
              'One or more packages to check. You can specify multiple by doing -p <name1> -p <name2> -p <name3>',
            type: 'array',
          })
          .option('json', {
            default: false,
            description: 'If true, lists the changed files as a JSON blob piped to your terminal',
            type: 'boolean',
          }),
      async args => {
        const filteredPackages = filterPackagesByNames(await getPackages(args.cwd), args.package);

        if (!filteredPackages) return console.warn('No packages were found that match your arguments');

        const tagResults = await getLastKnownPublishTagInfoForAllPackages(filteredPackages, args.cwd);
        const changedFiles = Array.from(
          new Set(
            (
              await Promise.all(tagResults.map(async t => (t.sha ? gitAllFilesChangedSinceSha(t.sha, args.cwd) : [])))
            ).flat(),
          ),
        );

        if (args.json) return console.info(JSON.stringify(changedFiles, null, 2));

        if (!changedFiles.length) {
          return console.warn(
            'No files have changed. This likely means you have not yet created your first version with the lets-version library',
          );
        }
        return console.info(changedFiles.join(os.EOL));
      },
    )
    .help();
  const { _ } = await yargs.argv;

  if (!_.length) return yargs.showHelp();
}

setupCLI();
