import os from 'node:os';
import path from 'node:path';

import type { PackageJson } from 'type-fest';

/**
 * Represents a raw git commit with no conventional commits connection
 * (basically straight from "git log")
 */
export class GitCommit {
  /**
   * @param author - Author of the commit
   * @param date - Date when the commit happened
   * @param email - Author's email
   * @param message - Raw commit message
   * @param sha - Unique hash for the commit
   */
  constructor(
    public author: string,
    public date: string,
    public email: string,
    public message: string,
    public sha: string,
  ) {}
}

/**
 * Represents a raw git commit with no conventional commits connection
 * (basically straight from "git log"), but with package info
 * attached to the commit. this might be uber verbose, but at least
 * we have all the data available
 */
export class GitCommitWithPackageInfo extends GitCommit {
  /**
   * @param author - Author of the commit
   * @param date - Date when the commit happened
   * @param email - Author's email
   * @param message - Raw commit message
   * @param sha - Unique hash for the commit
   * @param packageInfo - Parsed packageInfo
   */
  constructor(
    public author: string,
    public date: string,
    public email: string,
    public message: string,
    public sha: string,
    public packageInfo: PackageInfo,
  ) {
    super(author, date, email, message, sha);
  }
}

/**
 * Represents notes detected on a conventional commit
 */
export class GitConventionalNote {
  constructor(
    public title: string,
    public text: string,
  ) {}
}

export interface GitConventionalOpts {
  sha: string;
  author?: string | null;
  email?: string | null;
  body: string | null;
  breaking: boolean;
  footer: string | null;
  header: string | null;
  mentions: string[] | null;
  merge: string | null;
  notes: GitConventionalNote[];
  references?: string[];
  revert?: object | null;
  scope?: string | null;
  subject?: string | null;
  type?: ConventionalCommitType | null;
}

/**
 * Represents a parsed commit with conventional commits enriched data
 */
export class GitConventional {
  sha: string;
  author?: string | null;
  email?: string | null;
  body: string | null;
  breaking: boolean;
  footer: string | null;
  header: string | null;
  mentions: string[] | null;
  merge: string | null;
  notes: GitConventionalNote[];
  references?: object | null;
  revert?: object | null;
  scope?: string | null;
  subject?: string | null;
  type?: ConventionalCommitType | null;

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
    author,
    email,
  }: GitConventionalOpts) {
    this.sha = sha;

    this.author = author;

    this.email = email;

    this.body = body;

    this.breaking = breaking;

    this.footer = footer;

    this.header = header;

    this.mentions = mentions;

    this.merge = merge;

    this.notes = notes;

    this.references = references;

    this.revert = revert;

    this.scope = scope;

    this.subject = subject;

    this.type = type;
  }
}

/**
 * Represents a commit that has had its message parsed and converted
 * into a valid Conventional Commits structure
 */
export class GitCommitWithConventional extends GitCommit {
  constructor(
    public author: string,
    public date: string,
    public email: string,
    public message: string,
    public sha: string,
    public conventional: GitConventional,
  ) {
    super(author, date, email, message, sha);
  }
}

/**
 * Represents a commit that has had its message parsed and converted
 * into a valid Conventional Commits structure. Additionally, package
 * info will be attached to the commit
 */
/**
 * Represents a Git commit with conventional commit and package information
 */
export class GitCommitWithConventionalAndPackageInfo extends GitCommitWithConventional {
  packageInfo: PackageInfo;

  constructor(
    author: string,
    date: string,
    email: string,
    message: string,
    sha: string,
    conventional: GitConventional,
    packageInfo: PackageInfo,
  ) {
    super(author, date, email, message, sha, conventional);
    this.packageInfo = packageInfo;
  }
}

export interface PackageInfoOpts {
  filesChanged?: string[];
  isPrivate: boolean;
  name: string;
  packagePath: string;
  packageJSONPath: string;
  pkg: PackageJson;
  root: boolean;
  version: string;
}

export class PackageInfo {
  isPrivate: boolean;
  name: string;
  packageJSONPath: string;
  packagePath: string;
  pkg: PackageJson;
  root: boolean;
  version: string;
  filesChanged?: string[];

  constructor({ filesChanged, isPrivate, name, packageJSONPath, packagePath, pkg, root, version }: PackageInfoOpts) {
    this.isPrivate = isPrivate;
    this.name = name;
    this.packageJSONPath = packageJSONPath;
    this.packagePath = packagePath;
    this.pkg = pkg;
    this.root = root;
    this.version = version;
    this.filesChanged = filesChanged;
  }
}

export type DepType = 'self' | 'devDependencies' | 'dependencies' | 'optionalDependencies' | 'peerDependencies';

export interface LocalDependencyGraphNodeOpts extends PackageInfoOpts {
  depType: DepType;
  deps: LocalDependencyGraphNode[];
}

/**
 * Represents an instance of a local repository dependency
 * and any other local deps it relies on
 */
export class LocalDependencyGraphNode extends PackageInfo {
  depType: DepType;
  deps: LocalDependencyGraphNode[];

  constructor({ depType, deps, ...info }: LocalDependencyGraphNodeOpts) {
    super(info);
    this.depType = depType;
    this.deps = deps;
  }
}

/**
 * Represents information about a package and its latest detected git tag
 * that corresponds to a version or publish event
 */
export class PublishTagInfo {
  constructor(
    public packageName: string,
    public tag: string | null,
    public sha: string | null,
  ) {}
}

/**
 * Represents the which type of preset release a user can do.
 */
export enum ReleaseAsPresets {
  ALPHA = 'alpha',
  AUTO = 'auto',
  BETA = 'beta',
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
}

/**
 * Represents the type of commit, as detected
 * by the conventional parser
 *
 */
export enum ConventionalCommitType {
  BUILD = 'build',
  CHORE = 'chore',
  CI = 'ci',
  DOCS = 'docs',
  FEAT = 'feat',
  FIX = 'fix',
  PERF = 'perf',
  REFACTOR = 'refactor',
  REVERT = 'revert',
  STYLE = 'style',
  TEST = 'test',
}

/**
 * Represents a semver bump type operation
 */
export enum BumpType {
  PATCH = 0,
  MINOR = 1,
  MAJOR = 2,
  FIRST = 3,
  PRERELEASE = 4,
  EXACT = 5,
}

/**
 * Represents the type of entry that will be
 * added to a changelog
 *
 * @enum {string}
 */
export enum ChangelogEntryType {
  BREAKING = 'BREAKING',
  DOCS = 'DOCS',
  FEATURES = 'FEATURES',
  FIXES = 'FIXES',
  MISC = 'MISC',
}

/**
 * Will return the renderer that will be used for the
 * changelog entry type
 */
export const getChangelogEntryTypeRenderer = (type: ChangelogEntryType) => {
  switch (type) {
    case ChangelogEntryType.BREAKING:
      return '🚨 Breaking Changes 🚨';
    case ChangelogEntryType.DOCS:
      return '📖 Docs 📖';
    case ChangelogEntryType.FEATURES:
      return '✨ Features ✨';
    case ChangelogEntryType.FIXES:
      return '🛠️ Fixes 🛠️';
    default:
      return '🔀 Miscellaneous 🔀';
  }
};

/**
 * Represents the string version of a bump type for user display
 */
export const BumpTypeToString: Record<number, string> = Object.entries(BumpType).reduce(
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
  parentBumps: Set<BumpRecommendation>;

  constructor(
    public packageInfo: PackageInfo,
    public from: string | null,
    public to: string,
    public type: BumpType,
    parentBump?: BumpRecommendation,
  ) {
    this.parentBumps = new Set(parentBump ? [parentBump] : []);
  }

  /**
   * Determines if the bump is valid.
   * An invalid bump is one where the "from" an "to" are marked as the same.
   * This means there was an issue when attempting to recommend a bump in the "lets-version" logic
   */
  get isValid(): boolean {
    return this.from !== this.to;
  }

  /**
   * Computes a human-friendly bump type name
   * from the BumpType enum for this Bump recommendation
   */
  get bumpTypeName(): string {
    for (const [key, val] of Object.entries(BumpType)) {
      if (this.type === val) return key.toLowerCase();
    }
    throw new Error(`Invalid bump type of "${this.type}" detected`);
  }
}

export type ChangeLogEntryFormatter = (updates: ChangelogUpdate, allUpdates: ChangelogUpdate[]) => string;

export type ChangeLogLineFormatter = (line: GitConventional) => string | null;

export type ChangeLogRollupFormatter = (aggregatedUpdate: ChangelogAggregateUpdate) => string | null;

/**
 * Represents a single type of changelog update
 * that should be included as part of a larger "ChangelogUpdate."
 * This individual entry should be written to a CHANGELOG.md file
 * as part of the larger update
 */
export class ChangelogUpdateEntry {
  /**
   * Default formatter, will format each individual line of the changelog
   */
  static defaultFormatter(line: GitConventional): string {
    const formatted = `${line.header || line.subject || ''} ${line.sha ? `(${line.sha})` : ''}`;
    return `- ${formatted.trim()}`;
  }

  constructor(
    public type: ChangelogEntryType,
    public lines: GitConventional[],
    public formatter: ChangeLogLineFormatter = ChangelogUpdateEntry.defaultFormatter,
  ) {}

  /**
   * Returns a string representation of this specific changelog entry
   * that can be included in a parent ChangelogUpdate (which will then be
   * prepended to a CHANGELOG.md file)
   */
  toString(): string {
    return `### ${getChangelogEntryTypeRenderer(this.type)}${os.EOL}${os.EOL}${this.lines
      .map(l => this.formatter(l))
      .filter(Boolean)
      .join(os.EOL)}`;
  }
}

/**
 * Represents a changelog update that can be
 * prepends to a new or existing CHANGELOG.md file for a specific
 * package
 */
export class ChangelogUpdate {
  constructor(
    public formattedDate: string,
    public bumpRecommendation: BumpRecommendation,
    public entries: Record<string, ChangelogUpdateEntry>,
  ) {}

  /**
   * Returns an absolute path to the CHANGELOG.md
   * file that should correspond to this update
   */
  get changelogPath(): string {
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

/**
 * Represents a "rollup" CHANGELOG.md that will contain
 * all of the updates that happened for a given version bump operation.
 * Typically, this is placed at the root of a multi-package monorepo
 */
export class ChangelogAggregateUpdate {
  /**
   * @param {string} cwd
   * @param {string} formattedDate
   * @param {ChangelogUpdate[]} changelogUpdates
   */
  constructor(
    public cwd: string,
    public formattedDate: string,
    public changelogUpdates: ChangelogUpdate[],
  ) {}

  get changelogPath() {
    return path.join(this.cwd, 'CHANGELOG.md');
  }

  /**
   * Converts this ChangelogAggregateUpdate instance into a string that
   * can be safely prepended to a CHANGELOG.md file in the root of your project
   */
  toString(): string {
    const header = `# __All updates from ${this.formattedDate} are below:__`;

    const perChangeUpdates = this.changelogUpdates.reduce((prev, c) => {
      let update = `# ${c.bumpRecommendation.packageInfo.name} Updates${os.EOL}${os.EOL}`;
      update += `${c.toString()}${os.EOL}${os.EOL}`;
      return `${update}${prev}`;
    }, '');

    return `${header}${os.EOL}${os.EOL}${perChangeUpdates}---${os.EOL}`;
  }
}
