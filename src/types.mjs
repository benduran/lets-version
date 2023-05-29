/** @typedef {import('type-fest').PackageJson} PackageJson */

import os from 'os';
import path from 'path';

/**
 * Represents a raw git commit with no conventional commits connection
 * (basically straight from "git log")
 */
export class GitCommit {
  /**
   * @param {string} author - Author of the commit
   * @param {string} date - Date when the commit happened
   * @param {string} email - Author's email
   * @param {string} message - Raw commit message
   * @param {string} sha - Unique hash for the commit
   */
  constructor(author, date, email, message, sha) {
    /**
     * @type {string}
     */
    this.author = author;

    /**
     * @type {string}
     */
    this.date = date;

    /**
     * @type {string}
     */
    this.email = email;

    /**
     * @type {string}
     */
    this.message = message;

    /**
     * @type {string}
     */
    this.sha = sha;
  }
}

/**
 * Represents a raw git commit with no conventional commits connection
 * (basically straight from "git log"), but with package info
 * attached to the commit. this might be uber verbose, but at least
 * we have all the data available
 */
export class GitCommitWithPackageInfo extends GitCommit {
  /**
   * @param {string} author - Author of the commit
   * @param {string} date - Date when the commit happened
   * @param {string} email - Author's email
   * @param {string} message - Raw commit message
   * @param {string} sha - Unique hash for the commit
   * @param {PackageInfo} packageInfo - Parsed packageInfo
   */
  constructor(author, date, email, message, sha, packageInfo) {
    super(author, date, email, message, sha);

    /** @type {PackageInfo} */
    this.packageInfo = packageInfo;
  }
}

/**
 * Represents notes detected on a conventional commit
 */
export class GitConventionalNote {
  /**
   * @param {string} title
   * @param {string} text
   */
  constructor(title, text) {
    /** @type {string} */
    this.title = title;

    /** @type {string} */
    this.text = text;
  }
}

/**
 * Represents a parsed commit with conventional commits enriched data
 */
export class GitConventional {
  /**
   * @param {object} conventional
   * @param {string} conventional.sha
   * @param {string | null} conventional.body
   * @param {boolean} conventional.breaking
   * @param {string | null} conventional.footer
   * @param {string | null} conventional.header
   * @param {string[] | null} conventional.mentions
   * @param {string | null} conventional.merge
   * @param {GitConventionalNote[]} conventional.notes
   * @param {string[]} [conventional.references]
   * @param {object | null} [conventional.revert]
   * @param {string | null} [conventional.scope]
   * @param {string | null} [conventional.subject]
   * @param {ConventionalCommitType | null} [conventional.type]
   */
  constructor({
    body,
    breaking,
    footer,
    header,
    mentions,
    merge,
    notes,
    references,
    revert,
    scope,
    sha,
    subject,
    type,
  }) {
    /** @type {string} */
    this.sha = sha;

    /**
     * @type {string | null}
     */
    this.body = body;

    /** @type {boolean} */
    this.breaking = breaking;

    /**
     * @type {string | null}
     */
    this.footer = footer;

    /**
     * @type {string | null}
     */
    this.header = header;

    /**
     * @type {string[] | null}
     */
    this.mentions = mentions;

    /**
     * @type {string | null}
     */
    this.merge = merge;

    /**
     * @type {GitConventionalNote[]}
     */
    this.notes = notes;

    /**
     * @type {object | null | undefined}
     */
    this.references = references;

    /**
     * @type {object | null | undefined}
     */
    this.revert = revert;

    /**
     * @type {string | undefined | null}
     */
    this.scope = scope;

    /**
     * @type {string | undefined | null}
     */
    this.subject = subject;

    /**
     * @type {ConventionalCommitType | undefined | null}
     */
    this.type = type;
  }
}

/**
 * Represents a commit that has had its message parsed and converted
 * into a valid Conventional Commits structure
 */
export class GitCommitWithConventional extends GitCommit {
  /**
   * @param {string} author - Author of the commit
   * @param {string} date - Date when the commit happened
   * @param {string} email - Author's email
   * @param {string} message - Raw commit message
   * @param {string} sha - Unique hash for the commit
   * @param {GitConventional} conventional - Parsed conventional commit information
   */
  constructor(author, date, email, message, sha, conventional) {
    super(author, date, email, message, sha);

    /**
     * @type {GitConventional}
     */
    this.conventional = conventional;
  }
}

/**
 * Represents a commit that has had its message parsed and converted
 * into a valid Conventional Commits structure. Additionally, package
 * info will be attached to the commit
 */
export class GitCommitWithConventionalAndPackageInfo extends GitCommitWithConventional {
  /**
   * @param {string} author - Author of the commit
   * @param {string} date - Date when the commit happened
   * @param {string} email - Author's email
   * @param {string} message - Raw commit message
   * @param {string} sha - Unique hash for the commit
   * @param {GitConventional} conventional - Parsed conventional commit information
   * @param {PackageInfo} packageInfo - Parsed package info
   */
  constructor(author, date, email, message, sha, conventional, packageInfo) {
    super(author, date, email, message, sha, conventional);

    /** @type {PackageInfo} */
    this.packageInfo = packageInfo;
  }
}

/**
 * Represents a collection of information about a javascript package
 */
export class PackageInfo {
  /**
   * @param {object} info
   * @param {string[] | undefined} [info.filesChanged]
   * @param {boolean} info.isPrivate
   * @param {string} info.name
   * @param {string} info.packagePath
   * @param {string} info.packageJSONPath
   * @param {PackageJson} info.pkg
   * @param {boolean} info.root
   * @param {string} info.version
   */
  constructor({ filesChanged, isPrivate, name, packageJSONPath, packagePath, pkg, root, version }) {
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

    /** @type {string[] | undefined} */
    this.filesChanged = filesChanged;
  }
}

/**
 * Represents information about a package and its latest detected git tag
 * that corresponds to a version or publish event
 */
export class PublishTagInfo {
  /**
   * @param {string} packageName
   * @param {string | null} tag
   * @param {string | null} sha
   */
  constructor(packageName, tag, sha) {
    /** @type {string} */
    this.packageName = packageName;

    /** @type {string | null} */
    this.tag = tag;

    /** @type {string | null} */
    this.sha = sha;
  }
}

/**
 * Represents the type of commit, as detected
 * by the conventional parser
 *
 * @enum {string}
 */
export const ConventionalCommitType = {
  BUILD: 'build',
  CHORE: 'chore',
  CI: 'ci',
  DOCS: 'docs',
  FEAT: 'feat',
  FIX: 'fix',
  PERF: 'perf',
  REFACTOR: 'refactor',
  REVERT: 'revert',
  STYLE: 'style',
  TEST: 'test',
};

/**
 * Represents a semver bump type operation
 *
 * @enum {number}
 */
export const BumpType = {
  PATCH: 0,
  MINOR: 1,
  MAJOR: 2,
  FIRST: 3,
  PRERELEASE: 4,
};

/**
 * Represents the type of entry that will be
 * added to a changelog
 *
 * @enum {string}
 */
export const ChangelogEntryType = {
  BREAKING: '🚨 Breaking Changes 🚨',
  DOCS: '📖 Docs 📖',
  FEATURES: '✨ Features ✨',
  FIXES: '🛠️ Fixes 🛠️',
  MISC: '🔀 Miscellaneous 🔀',
};

/**
 * Represents the string version of a bump type for user display
 *
 * @type {Object.<number, string>}
 */
export const BumpTypeToString = Object.entries(BumpType).reduce(
  (prev, [key, val]) => ({
    ...prev,
    [val]: key,
  }),
  {},
);

/**
 * Represents information about a version bump recommendation
 * for a specific parsed package
 */
export class BumpRecommendation {
  /**
   * @param {PackageInfo} packageInfo
   * @param {string | null} from
   * @param {string} to
   * @param {BumpType} type
   */
  constructor(packageInfo, from, to, type) {
    /** @type {PackageInfo} */
    this.packageInfo = packageInfo;

    /** @type {string | null} */
    this.from = from;

    /** @type {string} */
    this.to = to;

    /** @type {BumpType} */
    this.type = type;
  }

  /**
   * Determines if the bump is valid.
   * An invalid bump is one where the "from" an "to" are marked as the same.
   * This means there was an issue when attempting to recommend a bump in the "lets-version" logic
   *
   * @returns {boolean}
   */
  get isValid() {
    return this.from !== this.to;
  }
}

/**
 * Represents a single type of changelog update
 * that should be included as part of a larger "ChangelogUpdate."
 * This individual entry should be written to a CHANGELOG.md file
 * as part of the larger update
 */
export class ChangelogUpdateEntry {
  /**
   * @param {ChangelogEntryType} type
   * @param {GitConventional[]} lines
   */
  constructor(type, lines) {
    /** @type {ChangelogEntryType} */
    this.type = type;

    /** @type {GitConventional[]} */
    this.lines = lines;
  }

  /**
   * Returns a string representation of this specific changelog entry
   * that can be included in a parent ChangelogUpdate (which will then be
   * prepended to a CHANGELOG.md file)
   *
   * @returns {string}
   */
  toString() {
    return `### ${this.type}${os.EOL}${os.EOL}${this.lines
      .map(l => `* ${l.header} ${l.sha ? `(${l.sha})` : ''}`)
      .join(os.EOL)}`;
  }
}

/**
 * Represents a changelog update that can be
 * prepends to a new or existing CHANGELOG.md file for a specific
 * package
 */
export class ChangelogUpdate {
  /**
   * @param {string} formattedDate
   * @param {BumpRecommendation} bumpRecommendation
   * @param {Object.<string, ChangelogUpdateEntry>} entries
   */
  constructor(formattedDate, bumpRecommendation, entries) {
    /** @type {string} */
    this.formattedDate = formattedDate;

    /** @type {BumpRecommendation} */
    this.bumpRecommendation = bumpRecommendation;

    /**
     * Dictionary of ChangelogEntryType to actual updates and their lines to be written
     *
     * @type {Object.<string, ChangelogUpdateEntry>}
     */
    this.entries = entries;
  }

  /**
   * Returns an absolute path to the CHANGELOG.md
   * file that should correspond to this update
   *
   * @returns {string}
   */
  get changelogPath() {
    return path.join(this.bumpRecommendation.packageInfo.packagePath, 'CHANGELOG.md');
  }

  /**
   * Converts this ChangelogUpdate instance into a string that
   * can be safely prepended to a CHANGELOG.md file
   *
   * @returns {string}
   */
  toString() {
    const header = `## ${this.bumpRecommendation.to} (${this.formattedDate})`;
    const entries = Object.values(this.entries)
      .map(e => e.toString())
      .join(`${os.EOL}${os.EOL}${os.EOL}${os.EOL}`);

    return `${header}${os.EOL}${os.EOL}${entries}${os.EOL}`;
  }
}
