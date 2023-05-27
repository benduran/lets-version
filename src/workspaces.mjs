import appRootPath from 'app-root-path';
import { detect } from 'detect-package-manager';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

import { fixCWD } from './cwd.mjs';

/**
 * Attempts to detect whether this repository is a multi-package monorepo.
 *
 * @param {string} [cwd=appRootPath.toString()]
 * @returns {Promise<boolean>}
 */
export async function detectIfMonorepo(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const pm = await detect({ cwd: fixedCWD });
  switch (pm) {
    case 'pnpm': {
      const pnpmWorkspaceFilePath = path.join(fixedCWD, 'pnpm-workspace.yaml');
      try {
        const workspaceFileContents = await fs.readFile(pnpmWorkspaceFilePath, 'utf-8');

        /**
         * @typedef {Object} PNPMWorkspaces
         * @property {string[]} [packages]
         */
        /** @type {PNPMWorkspaces} */
        const parsedYaml = yaml.parse(workspaceFileContents) ?? {};

        return Boolean(parsedYaml);
      } catch (err) {
        /* file doesn't exist or the input is malformed */
        return false;
      }
    }
    default: {
      const rootPJSONPath = path.join(fixedCWD, 'package.json');

      /** @type {import('type-fest').PackageJson} */
      const rootpjson = JSON.parse(await fs.readFile(rootPJSONPath, 'utf-8'));

      return Boolean(rootpjson.workspaces);
    }
  }
}
