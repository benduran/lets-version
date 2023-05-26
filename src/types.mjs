/** @typedef {import('type-fest').PackageJson} PackageJson */

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
   * @param {string | null} conventional.body
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
  constructor({ body, footer, header, mentions, merge, notes, references, revert, scope, subject, type }) {
    /**
     * @type {string | null}
     */
    this.body = body;

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
 * @enum {string}
 */
export const BumpType = {
  FIRST: 'FIRST',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  PATCH: 'PATCH',
};

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
}
