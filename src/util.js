/**
 * @typedef {import('./types.js').ChangeLogLineFormatter} ChangeLogLineFormatter
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
 * Attempts to read the supplied path to a file that exports a ChangeLogLineFormatter
 *
 * @param {string | undefined} formatterPath
 *
 * @returns {Promise<ChangeLogLineFormatter | undefined>}
 */
export async function readChangeLogLineFormatterFile(formatterPath) {
  if (formatterPath) {
    const resolvedFormatterPath = path.resolve(process.cwd(), formatterPath);
    const isFile = fs.statSync(resolvedFormatterPath, { throwIfNoEntry: false })?.isFile() || false;

    if (isFile) {
      const result = await import(resolvedFormatterPath);
      return result.default;
    }
  }

  return undefined;
}
