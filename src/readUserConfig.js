/**
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('./types.js').ChangeLogLineFormatter} ChangeLogLineFormatter
 * @typedef {import('./types.js').ChangeLogEntryFormatter} ChangeLogEntryFormatter
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * @typedef {Object} ChangelogConfig
 *
 * @property {ChangeLogLineFormatter} [changelogLineFormatter] - A custom changelog line formatter, which is a function that accepts a single argument of type "ChangelogLineFormatterArgs" and returns a string or null
 * @property {ChangeLogEntryFormatter} [changeLogEntryFormatter] - A custom changelog entry formatter, which is a function that accepts an array of change log entries and returns the full changelog entry string
 */

/**
 * @typedef {Object} LetsVersionConfig
 *
 * @property {ChangelogConfig} [changelog]
 */

/**
 * Utility function that returns an array of all paths
 * in the CWD up to the root
 *
 * @param {string} cwd
 */
function getAllFoldersUpToRoot(cwd) {
  /** @type {string[]} */
  const out = [];

  let buffer = '';
  for (const char of cwd) {
    if (char === path.sep) out.push(buffer.length ? buffer : path.sep);

    buffer += char;
  }

  out.push(buffer);

  return out.sort((a, b) => b.localeCompare(a));
}

/**
 * Attempts to read the nearest turboTools.config.js file (if it exists)
 * and returns its contents
 *
 * @param {string} cwd
 *
 * @returns {Promise<LetsVersionConfig | null>}
 */
export async function readLetsVersionConfig(cwd) {
  /**
   * @param {string} prefix
   * @returns {string}
   */
  const getLetsVersionConfigFilePath = prefix => {
    if (prefix.endsWith(path.sep)) return `${prefix}letsVersion.config.mjs`;
    return `${prefix}${path.sep}letsVersion.config.mjs`;
  };

  for (const dir of getAllFoldersUpToRoot(cwd)) {
    const configPath = getLetsVersionConfigFilePath(dir);
    const isFile = fs.statSync(configPath, { throwIfNoEntry: false })?.isFile() || false;
    if (isFile) {
      const result = await import(configPath);
      return result.default;
    }
  }

  return null;
}

/**
 * Simple pass-through utility for providing TypeScript typings
 * in non-TS environments when defining a config override
 *
 * @param {LetsVersionConfig} config
 *
 * @returns {LetsVersionConfig}
 */
export function defineLetsVersionConfig(config) {
  return config;
}
