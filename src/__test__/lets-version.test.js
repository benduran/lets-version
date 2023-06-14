import glob from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { listPackages } from '../lets-version.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads and parses a package.json file to a JSON object
 *
 * @param {string} fp
 *
 * @returns {Promise<import('type-fest').PackageJson>}
 */
const readPJSON = async fp => JSON.parse(await fs.readFile(path.join(fp, 'package.json'), 'utf-8'));

/**
 * Reads all proposed package.json files from the dummy monorepos
 *
 * @param {string} fp
 * @returns
 */
const readAllPJSONs = async fp => {
  const allPjsons = (
    await Promise.all(
      (
        await glob(path.join(__dirname, './dummyProjects', 'multiNPM', '**', 'package.json'), {
          absolute: true,
          onlyFiles: true,
        })
      )
        .filter(fp => !fp.includes('node_modules'))
        .map(async fp => {
          /** @type {import('type-fest').PackageJson} */
          const parsed = JSON.parse(await fs.readFile(fp, 'utf-8'));
          return parsed;
        }),
    )
  )
    .filter(p => p?.name !== 'multi-package')
    .sort((a, b) => a.name?.localeCompare(b.name ?? '') || 0);

  return allPjsons;
};

describe('lets-version.js tests', () => {
  const singleNPMProjectPath = path.join(__dirname, './dummyProjects/singleNPM');
  const multiNPMProjectPath = path.join(__dirname, './dummyProjects/multiNPM');
  const singleYarnProjectPath = path.resolve(__dirname, './dummyProjects/singleYarn');
  const multiYarnProjectPath = path.resolve(__dirname, './dummyProjects/multiYarn');
  const singlePNPMProjectPath = path.resolve(__dirname, './dummyProjects/singlePNPM');
  const multiPNPMProjectPath = path.resolve(__dirname, './dummyProjects/multiPNPM');

  it('Should list the only package in a single-package NPM repository', async () => {
    const pjson = await readPJSON(singleNPMProjectPath);
    const results = await listPackages({ cwd: singleNPMProjectPath });
    expect(results.length).toBe(1);
    expect(results[0]?.pkg).toStrictEqual(pjson);
  });

  it('Should list the only package in a multi-package NPM repository', async () => {
    const allPjsons = await readAllPJSONs(multiNPMProjectPath);
    const results = await listPackages({ cwd: multiNPMProjectPath });
    expect(results.length).toBe(3);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const p = allPjsons[i];
      expect(r?.pkg).toStrictEqual(p);
    }
  });

  it('Should list the only package in a single-package PNPM repository', async () => {
    const pjson = await readPJSON(singlePNPMProjectPath);
    const results = await listPackages({ cwd: singlePNPMProjectPath });
    expect(results.length).toBe(1);
    expect(results[0]?.pkg).toStrictEqual(pjson);
  });

  it('Should list the only package in a multi-package PNPM repository', async () => {
    const allPjsons = await readAllPJSONs(multiPNPMProjectPath);
    const results = await listPackages({ cwd: multiPNPMProjectPath });
    expect(results.length).toBe(3);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const p = allPjsons[i];
      expect(r?.pkg).toStrictEqual(p);
    }
  });

  it('Should list the only package in a single-package Yarn repository', async () => {
    const pjson = await readPJSON(singleYarnProjectPath);
    const results = await listPackages({ cwd: singleYarnProjectPath });
    expect(results.length).toBe(1);
    expect(results[0]?.pkg).toStrictEqual(pjson);
  });

  it('Should list the only package in a multi-package Yarn repository', async () => {
    const allPjsons = await readAllPJSONs(multiYarnProjectPath);
    const results = await listPackages({ cwd: multiYarnProjectPath });
    expect(results.length).toBe(3);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const p = allPjsons[i];
      expect(r?.pkg).toStrictEqual(p);
    }
  });
});
