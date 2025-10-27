import appRootPath from 'app-root-path';
import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';
import yaml from 'yaml';

import { fixCWD } from './cwd.js';
import { getPackageManager } from './getPackageManager.js';

/**
 * Attempts to detect whether this repository is a multi-package monorepo.
 */
export async function detectIfMonorepo(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);

  const pm = await getPackageManager(fixedCWD);
  const rootPjsonPath = path.join(fixedCWD, 'package.json');
  const pjson = JSON.parse(await fs.readFile(rootPjsonPath, 'utf8')) as PackageJson;

  // short circuit if the package.json tells us it's a monorepo
  if (Array.isArray(pjson.workspaces) && pjson.workspaces.length) return true;
  if (pm === 'pnpm') {
    const pnpmWorkspaceFilePath = path.join(fixedCWD, 'pnpm-workspace.yaml');
    try {
      const workspaceFileContents = await fs.readFile(pnpmWorkspaceFilePath, 'utf-8');

      type PNPMWorkspaces = {
        packages?: string[];
      };
      const parsedYaml: PNPMWorkspaces = yaml.parse(workspaceFileContents) ?? {};

      return Boolean(parsedYaml.packages?.length);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      /* file doesn't exist or the input is malformed */
      return false;
    }
  }
}
