/** @typedef {import('type-fest').PackageJson} PackageJson */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import createCLI from 'yargs';
import { hideBin } from 'yargs/helpers';

import { getPackages } from './getPackages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupCLI() {
  /** @type {PackageJson} */
  const pjson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8'));

  const yargs = createCLI(hideBin(process.argv))
    .version(pjson.version || '')
    .option('cwd', {
      default: process.cwd(),
      description: "The folder to use as root when running command. Defaults to your session's CWD",
      type: 'string',
    })
    .command(
      'ls',
      'Shows all detected packages for this repository',
      y =>
        y.option('json', {
          default: false,
          description:
            'If true, lists the detected packages and their information as a JSON blob piped to your terminal',
          type: 'boolean',
        }),
      async y => {
        const packages = await getPackages(y.cwd);
        if (y.json) return console.info(JSON.stringify(packages, null, 2));

        return console.info(packages.map(p => p.packagePath).join(os.EOL));
      },
    )
    .help();
  const { _ } = await yargs.argv;

  if (!_.length) return yargs.showHelp();
}

setupCLI();
