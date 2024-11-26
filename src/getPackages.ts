import mapWorkspaces from '@npmcli/map-workspaces';
import appRootPath from 'app-root-path';
import { detect as detectPackageManager } from 'detect-package-manager';
import { promises as fs } from 'fs';
import path from 'path';
import { PackageJson } from 'type-fest';

import { fixCWD } from './cwd.js';
import { fuckYouWes } from './exec.js';
import { PackageInfo } from './types.js';
import { detectIfMonorepo } from './workspaces.js';

/**
 * Tries to figure out what all packages live in repository.
 * The repository may be a multi-package monorepo, or a single package
 * repo. Either way, we want to support both.
 * We will leave the responsibilty of updating the "root" monorepo package
 * to the user. They can use this library, but it will be opt-in.
 */
export async function getPackages(cwd = appRootPath.toString()) {
  const fixedCWD = fixCWD(cwd);
  const pm = await detectPackageManager({ cwd: fixedCWD });

  const rootPJSONPath = path.join(fixedCWD, 'package.json');

  const rootPJSON = JSON.parse(await fs.readFile(rootPJSONPath, 'utf8')) as PackageJson;

  let workspaces = new Map<string, string>();

  if (pm === 'pnpm') {
    // this will also include the ROOT workspace, which we need to manually exclude
    const pnpmOutput = await fuckYouWes('pnpm list -r --dept -1 --json', { cwd: fixedCWD, stdio: 'pipe' });

    const foundPnpmWorkspaces: Array<{ name: string; path: string; private: boolean; version: string }> = JSON.parse(
      pnpmOutput || '',
    );

    workspaces = new Map(foundPnpmWorkspaces.filter(w => w.name !== rootPJSON.name).map(w => [w.name, w.path]));
  } else {
    // yarn and npm use the same "workspaces" field in the package.json,
    // so we can rely on the npmcli detection algo
    workspaces = await mapWorkspaces({
      cwd: fixedCWD,
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
      const pjson = JSON.parse(await fs.readFile(path.join(packagePath, 'package.json'), 'utf8')) as PackageJson;

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

/**
 * Based on an input set of files that have been touched by some series of git commits,
 * returns an array of PackageInfo[] that have been changed since
 */
export async function getAllPackagesChangedBasedOnFilesModified(
  filesModified: string[],
  packages: PackageInfo[],
  cwd = appRootPath.toString(),
): Promise<PackageInfo[]> {
  const fixedCWD = fixCWD(cwd);
  const packagesToCheck = packages?.length ? packages : await getPackages(fixedCWD);

  const out = new Map<string, PackageInfo>();

  for (const filePath of filesModified) {
    const touchedPackage = packagesToCheck.find(p => filePath.includes(p.packagePath));
    if (touchedPackage) {
      const prevTrackedTouchedPackage = out.get(touchedPackage.name);
      const updatedPackage = new PackageInfo({
        ...touchedPackage,
        filesChanged: [...(prevTrackedTouchedPackage?.filesChanged ?? []), filePath],
      });
      out.set(touchedPackage.name, updatedPackage);
    }
  }

  return Array.from(out.values());
}

/**
 * Given a set of found packages and an array of possible names,
 * filters the packages to only those that have exact name matches.
 *
 * Additionally, this function will remove the root package
 * if this repository is detected to be a multipackage monorepo
 *
 * If no names are provided, all packages are returned
 */
export async function filterPackagesByNames(
  packages: PackageInfo[],
  names: string[] | undefined,
  cwd = appRootPath.toString(),
): Promise<PackageInfo[]> {
  const fixedCWD = fixCWD(cwd);

  const namesSet = new Set(names ?? []);

  const out = !namesSet.size ? packages : packages.filter(p => namesSet.has(p.name));

  const isMonorepo = await detectIfMonorepo(fixedCWD);

  return out.filter(p => (isMonorepo && !p.root) || !isMonorepo);
}
