/**
 * @typedef {import('./types.js').ChangeLogLineFormatter} ChangeLogLineFormatter
 * @typedef {import('./types.js').ChangeLogEntryFormatter} ChangeLogEntryFormatter
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Pauses execution for a few moments before resolving
 *
 * @param {number} amount - Amount of milliseconds to sleep before resuming
 *
 * @returns {Promise<void>}
 */
export function sleep(amount) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), amount);
  });
}

/**
 * Given an input array,
 * reduces it to a 2D array
 * where each index is a certain chunk size
 *
 * @param {any[]} arr
 * @param {number} [size=5]
 *
 * @returns {any[][]}
 */
export function chunkArray(arr, size = 5) {
  /** @type {any[][]} */
  const out = [];

  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }

  return out;
}

/**
 * Attempts to read the supplied path to a file that exports a default function
 *
 * @param {string | undefined} filePath
 */
export async function loadDefaultExportFunction(filePath) {
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
 *
 * @param {string} key
 * @param {boolean} updatePeer
 * @param {boolean} updateOptional
 *
 * @returns {boolean}
 */
export function isPackageJSONDependencyKeySupported(key, updatePeer, updateOptional) {
  if (key === 'dependencies' || key === 'devDependencies') return true;
  if (key === 'peerDependencies' && updatePeer) return true;
  if (key === 'optionalDependencies' && updateOptional) return true;

  return false;
}

/**
 * Left-indents content to a certain depth
 *
 * @param {string} content
 * @param {number} [depth=0]
 */
export function indentStr(content, depth = 0) {
  let out = content;

  for (let i = 0; i < depth; i++) {
    out = ` ${out}`;
  }

  return out;
}
