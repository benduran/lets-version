import path from 'node:path';
import os from 'node:os';
import detectIndent from 'detect-indent';
import fs from 'fs-extra';
import type { PackageJson } from 'type-fest';

/**
 * Flushes package.json contents to disk,
 * maintaining the user's original indentation size and type
 */
export async function writePackageJSON(contents: PackageJson, filePath: string) {
  const p = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  const ogPackageJson = await fs.readFile(p, 'utf-8');

  const indent = detectIndent(ogPackageJson);
  await fs.writeFile(p, `${JSON.stringify(contents, null, indent.indent ?? ' ')}${os.EOL}`, 'utf-8');
}
