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

describe('lets-version.js tests', () => {
  const singleNPMProjectPath = path.join(__dirname, './dummyProjects/singleNPM');
  const singleYarnProjectPath = path.resolve(__dirname, './dummyProjects/singleYarn');
  const singlePNPMProjectPath = path.resolve(__dirname, './dummyProjects/singlePNPM');

  it('Should list the only package in a single-package repository', async () => {
    const pjson = await readPJSON(singleNPMProjectPath);
    const results = await listPackages(singleNPMProjectPath);
    expect(results.length).toBe(1);
    expect(results[0]?.pkg).toStrictEqual(pjson);
  });
});
