import mapWorkspaces from '@npmcli/map-workspaces';
import appRootPath from 'app-root-path';
import { detect as detectPackageManager } from 'detect-package-manager';
import { execaCommand } from 'execa';
import { promises as fs } from 'fs';
import path from 'path';

/** @typedef {import('type-fest').PackageJson} PackageJson */

export class PackageInfo {
  /**
   * @param {object} info
   * @param {boolean} info.isPrivate
   * @param {string} info.name
   * @param {string} info.packagePath
   * @param {string} info.packageJSONPath
   * @param {PackageJson} info.pkg
   * @param {boolean} info.root
   * @param {string} info.version
   */
  constructor({ isPrivate, name, packageJSONPath, packagePath, pkg, root, version }) {
    /** @type {boolean} */
    this.isPrivate = isPrivate;

    /** @type {string} */
    this.name = name;

    /** @type {string} */
    this.packageJSONPath = packageJSONPath;

    /** @type {string} */
    this.packagePath = packagePath;

    /** @type {PackageJson} */
    this.pkg = pkg;

    /** @type {boolean} */
    this.root = root;

    /** @type {string} */
    this.version = version;
  }
}

/**
 * Tries to figure out what all packages live in repository.
 * The repository may be a multi-package monorepo, or a single package
 * repo. Either way, we want to support both.
 * We will leave the responsibilty of updating the "root" monorepo package
 * to the user. They can use this library, but it will be opt-in.
 *
 * @param {string} [cwd=appRootPath.toString()] - Repo root to work in. Defaults to closest .git repo
 */
export async function getPackages(cwd = appRootPath.toString()) {
  const pm = await detectPackageManager({ cwd });

  const rootPJSONPath = path.join(cwd, 'package.json');

  /** @type {PackageJson} */
  const rootPJSON = JSON.parse(await fs.readFile(rootPJSONPath, 'utf8'));

  /** @type {Map<string, string>} */
  let workspaces;

  if (pm === 'pnpm') {
    // this will also include the ROOT workspace, which we need to manually exclude
    const pnpmOutput = await execaCommand('pnpm list -r --dept -1 --json', { cwd, stdio: 'pipe' });

    /** @type {Array<{ name: string; path: string; private: boolean; version: string }>} */
    const foundPnpmWorkspaces = JSON.parse(pnpmOutput.stdout);

    workspaces = new Map(foundPnpmWorkspaces.filter(w => w.name !== rootPJSON.name).map(w => [w.name, w.path]));
  } else {
    // yarn and npm use the same "workspaces" field in the package.json,
    // so we can rely on the npmcli detection algo
    workspaces = await mapWorkspaces({
      cwd,
      pkg: rootPJSON,
    });
  }

  const rootPackage = new PackageInfo({
    isPrivate: rootPJSON.private || false,
    name: rootPJSON.name || '',
    packageJSONPath: rootPJSONPath,
    packagePath: path.dirname(rootPJSONPath),
    pkg: rootPJSON,
    root: true,
    version: rootPJSON.version || '',
  });

  const packages = await Promise.all(
    Array.from(workspaces.entries()).map(async ([name, packagePath]) => {
      /** @type {PackageJson} */
      const pjson = JSON.parse(await fs.readFile(path.join(packagePath, 'package.json'), 'utf8'));

      return new PackageInfo({
        isPrivate: pjson.private ?? false,
        name,
        packagePath,
        packageJSONPath: path.join(packagePath, 'package.json'),
        pkg: pjson,
        root: false,
        version: pjson.version || '',
      });
    }),
  );

  // always include the root
  return [rootPackage, ...packages].sort((a, b) => a.name.localeCompare(b.name));
}
