import fs from 'fs-extra';
import path from 'path';
import type { PackageJson } from 'type-fest';

import type { ChangeLogEntryFormatter, ChangeLogLineFormatter, ChangeLogRollupFormatter } from './types.js';

export interface ChangelogConfig {
  changeLogEntryFormatter?: ChangeLogEntryFormatter;
  changelogLineFormatter?: ChangeLogLineFormatter;
  changeLogRollupFormatter?: ChangeLogRollupFormatter;
}

export interface LetsVersionConfig {
  changelog?: ChangelogConfig;
}

/**
 * Utility function that returns an array of all paths
 * in the CWD up to the root
 */
function getAllFoldersUpToRoot(cwd: string): string[] {
  const out: string[] = [];

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
 */
export async function readLetsVersionConfig(cwd: string): Promise<LetsVersionConfig | null> {
  const getLetsVersionConfigFilePath = (prefix: string): string => {
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
 */
export function defineLetsVersionConfig(config: LetsVersionConfig): LetsVersionConfig {
  return config;
}

export type { PackageJson };
export type { ChangeLogEntryFormatter, ChangeLogLineFormatter, ChangeLogRollupFormatter };
export { getAllFoldersUpToRoot };
