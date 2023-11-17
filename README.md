# lets-version

A package that reads your conventional commits and git history and recommends (or applies) a SemVer version bump for you. Supports single-package repositories, as well as multi-package repositories!

---

## What is this package intending to be?

If you have been relying on [lerna](https://www.npmjs.com/package/lerna) to automate your package version number managements, based on your commit history, or if you just want a hands-off way of applying version bumps to your `package.json` files in CI before you publish, this is the package for you!

---

## Example

```bash
npx lets-version apply-bumps

? The following bumps will be applied:

package: my-app
  bump: 0.0.0 -> 0.0.1
  type: PATCH
  valid: true

package: node-app
  bump: 0.0.0 -> 0.0.1
  type: PATCH
  valid: true

package: shared-utils
  bump: 0.0.0 -> 0.0.1
  type: PATCH
  valid: true

Do you want to continue? › (y/N)
```

---

## CLI Documentation

```bash
lets-version [command]

Commands:
  lets-version ls                           Lists all detected packages for this
                                             repository
  lets-version local-dep-graph              Builds a local repository-only depen
                                            dency graph. If you are in a monorep
                                            o, this is useful to visualize how t
                                            he dependencies in said monorepo rel
                                            ate to each other.
  lets-version last-version-tag             Gets the last tag used when version
                                            bumping for a specific package. If n
                                            o package is specified, all found ta
                                            gs for each package detected are ret
                                            urned
  lets-version changed-files-since-bump     Gets a list of all files that have c
                                            hanged since the last publish for a
                                            specific package or set of packages.
                                             If no results are returned, it like
                                            ly means that there was not a previo
                                            us version tag detected in git.
  lets-version changed-packages-since-bump  Gets a list of all packages that hav
                                            e changed since the last publish for
                                             a specific package or set of packag
                                            es. If no results are returned, it l
                                            ikely means that there was not a pre
                                            vious version tag detected in git.
  lets-version get-conventional-since-bump  Parsed git commits for a specific pa
                                            ckage or packages, using the officia
                                            l Conventional Commits parser
  lets-version get-bumps                    Gets a series of recommended version
                                             bumps for a specific package or set
                                             of packages. NOTE: It is possible f
                                            or your bump recommendation to not c
                                            hange. If this is the case, this mea
                                            ns that your particular package has
                                            never had a version bump by the lets
                                            -version library.
  lets-version apply-bumps                  Gets a series of recommended version
                                             bumps for a specific package or set
                                             of packages, applies the version bu
                                            mps, and updates all repository depe
                                            ndents to match the version that has
                                             been updated.
  lets-version changed-files-since-branch   Gets a list of all files that have c
                                            hanged in the current branch.
  lets-version changed-packages-since-bran  Gets a list of all packages that hav
  ch                                        e changed in the current branch.

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

### `ls`

Lists all detected packages for this repository.

```bash
lets-version ls

Lists all detected packages for this repository

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --cwd      The folder to use as root when running command. Defaults to your se
             ssion's CWD

  --json     If true, lists results as a JSON blob piped to your terminal
                                                      [boolean] [default: false]
```

### `local-dep-graph`

Builds a local repository-only dependency graph. If you are in a monorepo, this is useful to visualize how the dependencies in said monorepo relate to each other.

```bash
lets-version local-dep-graph

Builds a local repository-only dependency graph. If you are in a monorepo, this
is useful to visualize how the dependencies in said monorepo relate to each othe
r.

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --cwd      The folder to use as root when running command. Defaults to your se
             ssion's CWD

  --json     If true, lists results as a JSON blob piped to your terminal
                                                      [boolean] [default: false]
```

### `last-version-tag`

Gets the last tag used when version bumping for a specific package. If no package is specified, all found tags for each package detected are returned.

```bash
lets-version last-version-tag

Gets the last tag used when version bumping for a specific package. If no packag
e is specified, all found tags for each package detected are returned

Options:
      --version      Show version number                               [boolean]
      --help         Show help                                         [boolean]
      --cwd          The folder to use as root when running command. Defaults to
                      your session's CWD

      --json         If true, lists results as a JSON blob piped to your termina
                     l                                [boolean] [default: false]
  -p, --package      One or more packages to check. You can specify multiple by
                     doing -p <name1> -p <name2> -p <name3>              [array]
      --noFetchAll   If true, will not fetch information from remote via "git fe
                     tch origin"                      [boolean] [default: false]
      --noFetchTags  If true, does not force fetch tags from origin. By default,
                      lets-version will do "git fetch origin --tags --force" to
                     ensure your branch if up-to-date with the tags on origin
                                                      [boolean] [default: false]
```

### `changed-files-since-bump`

Gets a list of all files that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

```bash
lets-version changed-files-since-bump

Gets a list of all files that have changed since the last publish for a specific
 package or set of packages. If no results are returned, it likely means that th
ere was not a previous version tag detected in git.

Options:
      --version      Show version number                               [boolean]
      --help         Show help                                         [boolean]
      --cwd          The folder to use as root when running command. Defaults to
                      your session's CWD

      --json         If true, lists results as a JSON blob piped to your termina
                     l                                [boolean] [default: false]
  -p, --package      One or more packages to check. You can specify multiple by
                     doing -p <name1> -p <name2> -p <name3>              [array]
      --noFetchAll   If true, will not fetch information from remote via "git fe
                     tch origin"                      [boolean] [default: false]
      --noFetchTags  If true, does not force fetch tags from origin. By default,
                      lets-version will do "git fetch origin --tags --force" to
                     ensure your branch if up-to-date with the tags on origin
                                                      [boolean] [default: false]
```

### `changed-packages-since-bump`

Gets a list of all packages that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

```bash
lets-version changed-packages-since-bump

Gets a list of all packages that have changed since the last publish for a speci
fic package or set of packages. If no results are returned, it likely means that
 there was not a previous version tag detected in git.

Options:
      --version      Show version number                               [boolean]
      --help         Show help                                         [boolean]
      --cwd          The folder to use as root when running command. Defaults to
                      your session's CWD

      --json         If true, lists results as a JSON blob piped to your termina
                     l                                [boolean] [default: false]
  -p, --package      One or more packages to check. You can specify multiple by
                     doing -p <name1> -p <name2> -p <name3>              [array]
      --noFetchAll   If true, will not fetch information from remote via "git fe
                     tch origin"                      [boolean] [default: false]
      --noFetchTags  If true, does not force fetch tags from origin. By default,
                      lets-version will do "git fetch origin --tags --force" to
                     ensure your branch if up-to-date with the tags on origin
                                                      [boolean] [default: false]
      --byName       If true and the --json flag has not been set, reports the c
                     hanged packages by their package.json names, instead of by
                     their relative file paths        [boolean] [default: false]
```

### `get-conventional-since-bump`

Parsed git commits for a specific package or packages, using the official Conventional Commits parser

```bash
lets-version get-conventional-since-bump

Parsed git commits for a specific package or packages, using the official Conven
tional Commits parser

Options:
      --version      Show version number                               [boolean]
      --help         Show help                                         [boolean]
      --cwd          The folder to use as root when running command. Defaults to
                      your session's CWD

      --json         If true, lists results as a JSON blob piped to your termina
                     l                                [boolean] [default: false]
  -p, --package      One or more packages to check. You can specify multiple by
                     doing -p <name1> -p <name2> -p <name3>              [array]
      --noFetchAll   If true, will not fetch information from remote via "git fe
                     tch origin"                      [boolean] [default: false]
      --noFetchTags  If true, does not force fetch tags from origin. By default,
                      lets-version will do "git fetch origin --tags --force" to
                     ensure your branch if up-to-date with the tags on origin
                                                      [boolean] [default: false]
```

### `get-bumps`

Gets a series of recommended version bumps for a specific package or set of packages. NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.

```bash
lets-version get-bumps

Gets a series of recommended version bumps for a specific package or set of pack
ages. NOTE: It is possible for your bump recommendation to not change. If this i
s the case, this means that your particular package has never had a version bump
 by the lets-version library.

Options:
      --version         Show version number                            [boolean]
      --help            Show help                                      [boolean]
      --cwd             The folder to use as root when running command. Defaults
                         to your session's CWD

      --json            If true, lists results as a JSON blob piped to your term
                        inal                          [boolean] [default: false]
  -p, --package         One or more packages to check. You can specify multiple
                        by doing -p <name1> -p <name2> -p <name3>        [array]
      --noFetchAll      If true, will not fetch information from remote via "git
                         fetch origin"                [boolean] [default: false]
      --noFetchTags     If true, does not force fetch tags from origin. By defau
                        lt, lets-version will do "git fetch origin --tags --forc
                        e" to ensure your branch if up-to-date with the tags on
                        origin                        [boolean] [default: false]
      --releaseAs       Releases each changed package as this release type or as
                         an exact version. "major" "minor" "patch" "alpha" "beta
                        " "auto" or an exact semver version number are allowed.
                                                      [string] [default: "auto"]
      --preid           The "prerelease identifier" to use as a prefix for the "
                        prerelease" part of a semver. Like the rc in 1.2.0-rc.8.
                         If this is specified, a bump type of "prerelease" will
                        always take place, causing any "--releaseAs" setting to
                        be ignored.                                     [string]
      --uniqify         If true, will append the git SHA at version bunp time to
                         the end of the version number (while maintaining valid
                        semver)                       [boolean] [default: false]
      --forceAll        If true, forces all packages to receive a bump update, r
                        egardless of whether they have changed. What this means,
                         in practice, is that any package that would not normall
                        y be changed will receive a PATCH update (or an equivale
                        nt if --preid is set)         [boolean] [default: false]
      --updatePeer      If true, will update any dependent "package.json#peerDep
                        endencies" fields             [boolean] [default: false]
      --updateOptional  If true, will update any dependent "package.json#optiona
                        lDependencies" fields         [boolean] [default: false]
```

### `apply-bumps`

Gets a series of recommended version bumps for a specific package or set of packages, applies the version bumps, and updates all repository dependents to match the version that has been updated.

```bash
lets-version apply-bumps

Gets a series of recommended version bumps for a specific package or set of pack
ages, applies the version bumps, and updates all repository dependents to match
the version that has been updated.

Options:
      --version           Show version number                          [boolean]
      --help              Show help                                    [boolean]
      --cwd               The folder to use as root when running command. Defaul
                          ts to your session's CWD

      --json              If true, lists results as a JSON blob piped to your te
                          rminal                      [boolean] [default: false]
  -p, --package           One or more packages to check. You can specify multipl
                          e by doing -p <name1> -p <name2> -p <name3>    [array]
      --noFetchAll        If true, will not fetch information from remote via "g
                          it fetch origin"            [boolean] [default: false]
      --noFetchTags       If true, does not force fetch tags from origin. By def
                          ault, lets-version will do "git fetch origin --tags --
                          force" to ensure your branch if up-to-date with the ta
                          gs on origin                [boolean] [default: false]
      --releaseAs         Releases each changed package as this release type or
                          as an exact version. "major" "minor" "patch" "alpha" "
                          beta" "auto" or an exact semver version number are all
                          owed.                       [string] [default: "auto"]
      --preid             The "prerelease identifier" to use as a prefix for the
                           "prerelease" part of a semver. Like the rc in 1.2.0-r
                          c.8. If this is specified, a bump type of "prerelease"
                           will always take place, causing any "--releaseAs" set
                          ting to be ignored.                           [string]
      --uniqify           If true, will append the git SHA at version bunp time
                          to the end of the version number (while maintaining va
                          lid semver)                 [boolean] [default: false]
      --forceAll          If true, forces all packages to receive a bump update,
                           regardless of whether they have changed. What this me
                          ans, in practice, is that any package that would not n
                          ormally be changed will receive a PATCH update (or an
                          equivalent if --preid is set)
                                                      [boolean] [default: false]
      --updatePeer        If true, will update any dependent "package.json#peerD
                          ependencies" fields         [boolean] [default: false]
      --updateOptional    If true, will update any dependent "package.json#optio
                          nalDependencies" fields     [boolean] [default: false]
      --allowUncommitted  If true, will allow the version operation to continue
                          when there are uncommitted files in the repo at versio
                          n bump time. This is usefull if you have some scripts
                          that need to run after version bumps are performed, bu
                          t potentially before you issue a git commit and subseq
                          uent npm publish operation. [boolean] [default: false]
      --dryRun            If true, will print the changes that are expected to h
                          appen at every step instead of actually writing the ch
                          anges                       [boolean] [default: false]
      --rollupChangelog   If true, in addition to updating changelog files for a
                          ll packages that will be bumped, creates a "rollup" CH
                          ANGELOG.md at the root of the repo that contains an ag
                          gregate of changes          [boolean] [default: false]
      --noChangelog       If true, will not write CHANGELOG.md updates for each
                          package that has changed    [boolean] [default: false]
      --changelogDependencies
                          If true, changelog will include information about the
                          changes in the dependencies of a package that is being
                          bumped                  [boolean] [default: false]
      --noCommit          If true, will modify all required files but leave them
                           uncommitted after all operations have completed. This
                           will also prevent a git push from occurring
                                                      [boolean] [default: false]
      --noInstall         If true, will skip running "npm install" or your packa
                          ge manager's equivalent install after applying the bum
                          ps                          [boolean] [default: false]
      --noPush            If true, will not push changes and tags to origin
                                                      [boolean] [default: false]
  -y, --yes               If true, skips any confirmation prompts. Useful if you
                           need to automate this process in CI
                                                      [boolean] [default: false]
```

### `changed-files-since-branch`

Gets a list of all files that have changed in the current branch.

```bash
lets-version changed-files-since-branch

Gets a list of all files that have changed in the current branch.

Options:
      --version  Show version number                                   [boolean]
      --help     Show help                                             [boolean]
      --cwd      The folder to use as root when running command. Defaults to you
                 r session's CWD

      --json     If true, lists results as a JSON blob piped to your terminal
                                                      [boolean] [default: false]
  -b, --branch   Name of the branch to check against. [string] [default: "main"]
  -p, --package  One or more packages to check. You can specify multiple by doin
                 g -p <name1> -p <name2> -p <name3>                      [array]
```

### `changed-packages-since-branch`

Gets a list of all packages that have changed in the current branch.

```bash
lets-version changed-packages-since-branch

Gets a list of all packages that have changed in the current branch.

Options:
      --version  Show version number                                   [boolean]
      --help     Show help                                             [boolean]
      --cwd      The folder to use as root when running command. Defaults to you
                 r session's CWD

      --json     If true, lists results as a JSON blob piped to your terminal
                                                      [boolean] [default: false]
  -b, --branch   Name of the branch to check against. [string] [default: "main"]
  -p, --package  One or more packages to check. You can specify multiple by doin
                 g -p <name1> -p <name2> -p <name3>                      [array]
      --byName   If true and the --json flag has not been set, reports the chang
                 ed packages by their package.json names, instead of by their re
                 lative file paths                    [boolean] [default: false]
```

---

## Node API

The Node API is a 1:1 match for the CLI API, and can be used in its place. All exported functions accept the same arguments and product the same results. There are some additional functions that are available when using the Node API, if you're interested in exploring

### `listPackages(opts)`

Returns all detected packages for this repository

- Parameters
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getLastVersionTagsByPackageName(opts)`

Given an optional array of package names, reads the latest git tag that was used in a previous version bump operation.

- Parameters
  - `opts?.names?: string[]` - Defaults to `[]`
  - `opts?.noFetchTags?: boolean` - Defaults to `false`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedFilesSinceBump(opts)`

Gets a list of all files that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

- Parameters
  - `opts?.names?: string[]` - Defaults to `[]`
  - `opts?.noFetchTags?: boolean` - Defaults to `false`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedPackagesSinceBump(opts)`

Gets a list of all packages that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

- Parameters
  - `opts?.names?: string[]` - Defaults to `[]`
  - `opts?.noFetchTags?: boolean` - Defaults to `false`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getConventionalCommitsByPackage(opts)`

Parses commits since last publish for a specific package or set of packages and returns them represented as Conventional Commits objects.

- Parameters
  - `opts?.names?: string[]` - Defaults to `[]`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`


### `getRecommendedBumpsByPackage()`
Given an optional list of package names, parses the git history since the last bump operation and suggests a bump.
NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.

- Parameters
  - `opts?.names?: string[]` - Defaults to `undefined`
  - `opts?.releaseAs?: ReleaseAsPresets` - Defaults to `ReleaseAsPresets.AUTO`
  - `opts?.preid?: string` - Defaults to `undefined`
  - `opts?.uniqify?: boolean` - Defaults to `false`
  - `opts?.forceAll?: boolean` - Defaults to `false`
  - `opts?.noFetchAll?: boolean` - Defaults to `false`
  - `opts?.noFetchTags?: boolean` - Defaults to `false`
  - `opts?.updatePeer?: boolean` - Defaults to `false`
  - `opts?.updateOptional?: boolean` - Defaults to `false`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `applyRecommendedBumpsByPackage(opts)`

Given an optional list of package names, parses the git history since the last bump operation, suggest a bump and applies it, also updating any dependent package.json files across your repository.
NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.

- Parameters
  - `opts?.names?: string[]` - Defaults to `undefined`
  - `opts?.releaseAs?: ReleaseAsPresets` - Defaults to `ReleaseAsPresets.AUTO`
  - `opts?.preid?: string` - Defaults to `undefined`
  - `opts?.uniqify?: boolean` - Defaults to `false`
  - `opts?.forceAll?: boolean` - Defaults to `false`
  - `opts?.noFetchAll?: boolean` - Defaults to `false`
  - `opts?.noFetchTags?: boolean` - Defaults to `false`
  - `opts?.yes` - If true, skips all user confirmations - Defaults to `false`
  - `opts?.updatePeer` - If true, will update any dependent "package.json#peerDependencies" fields - Defaults to `false`
  - `opts?.updateOptional` - If true, will update any dependent `"package.json#optionalDependencies"` fields - Defaults to `false`
  - `opts?.noPush` - If true, will prevent pushing any changes to upstream / origin - Defaults to `false`
  - `opts?.rollupChangelog` - If true, in addition to updating changelog files for all packages that will be bumped, creates a "rollup" CHANGELOG.md at the root of the repo that contains an aggregate of changes.
  - `opts?.noChangelog` - If true, will not write CHANGELOG.md updates for each package that has changed. Defaults to `false`.
  - `opts?.changelogDependencies` - If true, changelog will include information about the changes in the dependencies of a package that is being bumped. Defaults to `false`.
  - `opts?.dryRun` - If true, will print the changes that are expected to happen at every step instead of actually writing the changes. Defaults to `false`.
    array of change log entries and returns the full changelog entry string. Defaults to `undefined`.
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedFilesSinceBranch(opts)`

Gets a list of all files that have changed since the current branch was created.

- Parameters
  - `opts?.branch?: string` - Defaults to `main`
  - `opts?.names?: string[]` - Defaults to `undefined`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedPackagesSinceBranch(opts)`

Gets a list of all packages that have changed since the current branch was created.

- Parameters
  - `opts?.branch?: string` - Defaults to `main`
  - `opts?.names?: string[]` - Defaults to `undefined`
  - `opts?.cwd?: string` - Defaults to `appRootPath.toString()`

---

### Advanced configuration

The `lets-version` library supports some additional configurations, which can be enabled and customized by creating a `letsVersion.config.mjs` config file in the root of your repository. Please take note of the **.mjs** extension. If you would like TypeScript type assistance support, you can use the provided `defineLetsVersionConfig(config)` function for this, which is a simple pass-through function. The available options are listed below, all of which are *optional*:

```javascript
import { defineLetsVersionConfig } from '@better-builds/lets-version';

export default defineLetsVersionConfig({
  changelog: {
    /**
     * A custom formatter that will take in all of the changes for a version and output what the change
     * log entry should look like
     *
     * @param {ChangelogUpdate} updates - The updates to be included in the changelog entry for a version
     * @returns {string} The formatted line to represent the entire changelog entry for a version
     */
    changeLogEntryFormatter(updates) {
      // updates is an instance of the `ChangelogUpdate` class.
      return ''; // Return some string to alter the Changelog contents, or null if you want to omit
    },

    /**
    * A custom formatter that will take in a single commit line and return a formatted string.
    *
    * @param {GitConventional} line - The individual line to format
    * @returns {string | null} The formatted line or null if you want to ignore the line
    */
    changelogLineFormatter(conventional) {
      // conventional is an instance of the `GitConventional` class

      return ''; // Return some string to alter the Changelog contents, or null if you want to omit this line
    },

    /**
    * A custom formatter that will take in an instance of the ChangelogAggregateUpdate,
    * which contains all of the updates and subsequent individual lines for the commit.
    *
    * If the output of this function is a string, this will cause an aggregated
    * changelog to get written.
    * @param {ChangelogAggregateUpdate} aggregatedUpdate
    *
    * @returns {string | null} String contents to be written, or null if you want nothing to be written
    */
    changeLogRollupFormatter(aggregatedUpdate) {
      // aggregatedUpdate is an instance of the `ChangelogAggregateUpdate` class

      return ''; // Return some string to alter the Changelog contents, or null if you want to skip writing a rollup changelog
    },
  },
});
```

## Get started contributing

1. Clone this repo
2. Run `./repo-setup.sh`
3. Happy hacking! ⌨️
