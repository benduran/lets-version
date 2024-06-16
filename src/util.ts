import fs from 'fs-extra';
import path from 'path';

/**
 * Pauses execution for a few moments before resolving
 */
export function sleep(amount: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), amount);
  });
}

/**
 * Given an input array,
 * reduces it to a 2D array
 * where each index is a certain chunk size
 */
export function chunkArray<T>(arr: T[], size = 5): T[][] {
  const out: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }

  return out;
}

/**
 * Attempts to read the supplied path to a file that exports a default function
 */
export async function loadDefaultExportFunction(filePath: string | undefined) {
  if (filePath) {
    const resolvedFilePath = path.resolve(process.cwd(), filePath);
    const isFile = fs.statSync(resolvedFilePath, { throwIfNoEntry: false })?.isFile() || false;

    if (isFile) {
      const result = await import(resolvedFilePath);
      return result.default;
    }
  }

  return undefined;
}

/**
 * Checks whether or not a package.json key is allowed to be updated / managed by "lets-version"
 */
export function isPackageJSONDependencyKeySupported(
  key: string,
  updatePeer: boolean,
  updateOptional: boolean,
): boolean {
  if (key === 'dependencies' || key === 'devDependencies') return true;
  if (key === 'peerDependencies' && updatePeer) return true;
  if (key === 'optionalDependencies' && updateOptional) return true;

  return false;
}

/**
 * Left-indents content to a certain depth
 */
export function indentStr(content: string, indentChar = ' ', depth = 0) {
  let out = content;

  for (let i = 0; i < depth; i++) {
    out = `${indentChar}${out}`;
  }

  return out;
}
