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
   * @param {string | null} [conventional.type]
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
     * @type {string | undefined | null}
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
 * Represents a collection of information about a javascript package
 */
export class PackageInfo {
  /**
   * @param {object} info
   * @param {boolean} info.isPrivate
   * @param {string} info.name
   * @param {string} info.packagePath
   * @param {string} info.packageJSONPath
   * @param {PackageJson} info.pkg
   * @param {boolean} info.root
   * @param {string} info.version
   */
  constructor({ isPrivate, name, packageJSONPath, packagePath, pkg, root, version }) {
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
  }
}
