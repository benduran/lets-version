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
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
      --version      Show version number                               [boolean]
      --help         Show help                                         [boolean]
      --cwd          The folder to use as root when running command. Defaults to
                      your session's CWD
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
      --releaseAs    Releases each changed package as this release type or as an
                      exact version. "major" "minor" "patch" "alpha" "beta" "aut
                     o" or an exact semver version number are allowed.
                                                      [string] [default: "auto"]
      --preid        The "prerelease identifier" to use as a prefix for the "pre
                     release" part of a semver. Like the rc in 1.2.0-rc.8. If th
                     is is specified, a bump type of "prerelease" will always ta
                     ke place, causing any "--releaseAs" setting to be ignored.
                                                                        [string]
      --uniqify      If true, will append the git SHA at version bunp time to th
                     e end of the version number (while maintaining valid semver
                     )                                [boolean] [default: false]
      --forceAll     If true, forces all packages to receive a bump update, rega
                     rdless of whether they have changed. What this means, in pr
                     actice, is that any package that would not normally be chan
                     ged will receive a PATCH update (or an equivalent if --prei
                     d is set)                        [boolean] [default: false]
```

### `apply-bumps`
Gets a series of recommended version bumps for a specific package or set of packages, applies the version bumps, and updates all repository dependents to match the version that has been updated.

```bash
lets-version apply-bumps

Gets a series of recommended version bumps for a specific package or set of pack
ages, applies the version bumps, and updates all repository dependents to match
the version that has been updated.

Options:
      --version         Show version number                            [boolean]
      --help            Show help                                      [boolean]
      --cwd             The folder to use as root when running command. Defaults
                         to your session's CWD
              [string] [default: "/Users/bduran/devlop/opensource/lets-version"]
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
  -y, --yes             If true, skips any confirmation prompts. Useful if you n
                        eed to automate this process in CI
                                                      [boolean] [default: false]
      --dryRun          If true, will print the changes that are expected to hap
                        pen at every step instead of actually writing the change
                        s                             [boolean] [default: false]
      --noChangelog     If true, will not write CHANGELOG.md updates for each pa
                        ckage that has changed        [boolean] [default: false]
      --noPush          If true, will not push changes and tags to origin
                                                      [boolean] [default: false]
      --updatePeer      If true, will update any dependent "package.json#peerDep
                        endencies" fields             [boolean] [default: false]
      --updateOptional  If true, will update any dependent "package.json#optiona
                        lDependencies" fields         [boolean] [default: false]
```
---

## Node API

The Node API is a 1:1 match for the CLI API, and can be used in its place. All exported functions accept the same arguments and product the same results. There are some additional functions that are available when using the Node API, if you're interested in exploring

### `listPackages(cwd)`
Returns all detected packages for this repository

* Parameters
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `getLastVersionTagsByPackageName(names, noFetchTags, cwd)`
Given an optional array of package names, reads the latest git tag that was used in a previous version bump operation.

* Parameters
  * `names?: string[]` - Defaults to `[]`
  * `noFetchTags?: boolean` - Defaults to `false`
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedFilesSinceBump(names, noFetchTags, cwd)`
Gets a list of all files that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

* Parameters
  * `names?: string[]` - Defaults to `[]`
  * `noFetchTags?: boolean` - Defaults to `false`
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `getChangedPackagesSinceBump(names, noFetchTags, cwd)`
Gets a list of all packages that have changed since the last publish for a specific package or set of packages. If no results are returned, it likely means that there was not a previous version tag detected in git.

* Parameters
  * `names?: string[]` - Defaults to `[]`
  * `noFetchTags?: boolean` - Defaults to `false`
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `getConventionalCommitsByPackage(names, cwd = appRootPath.toString())`
Parses commits since last publish for a specific package or set of packages and returns them represented as Conventional Commits objects.

* Parameters
  * `names?: string[]` - Defaults to `[]`
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `getRecommendedBumpsByPackage(names, releaseAs, preid, uniqify, forceAll, noFetchAll, noFetchTags, updatePeer, updateOptional, cwd)`
Given an optional list of package names, parses the git history since the last bump operation and suggests a bump.
NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.

* Parameters
  * `names?: string[]` - Defaults to `undefined`
  * `releaseAs?: ReleaseAsPresets` - Defaults to `ReleaseAsPresets.AUTO`
  * `preid?: string` - Defaults to `undefined`
  * `uniqify?: boolean` - Defaults to `false`
  * `forceAll?: boolean` - Defaults to `false`
  * `noFetchAll?: boolean` - Defaults to `false`
  * `noFetchTags?: boolean` - Defaults to `false`
  * `updatePeer?: boolean` - Defaults to `false`
  * `updateOptional?: boolean` - Defaults to `false`
  * `cwd?: string` - Defaults to `appRootPath.toString()`

### `applyRecommendedBumpsByPackage(names, releaseAs, preid, uniqify, forceAll, noFetchAll, noFetchTags, opts, cwd)`
Given an optional list of package names, parses the git history since the last bump operation, suggest a bump and applies it, also updating any dependent package.json files across your repository.
NOTE: It is possible for your bump recommendation to not change. If this is the case, this means that your particular package has never had a version bump by the lets-version library.

* Parameters
  * `names?: string[]` - Defaults to `undefined`
  * `releaseAs?: ReleaseAsPresets` - Defaults to `ReleaseAsPresets.AUTO`
  * `preid?: string` - Defaults to `undefined`
  * `uniqify?: boolean` - Defaults to `false`
  * `forceAll?: boolean` - Defaults to `false`
  * `noFetchAll?: boolean` - Defaults to `false`
  * `noFetchTags?: boolean` - Defaults to `false`
  * `opts?: { yes?: boolean; updatePeer?: boolean; updateOptional?: boolean; noPush?: boolean; noChangelog?: boolean; dryRun?: boolean }` - Defaults to:
    * `opts.yes` - If true, skips all user confirmations - Defaults to `false`
    * `opts.updatePeer` - If true, will update any dependent "package.json#peerDependencies" fields - Defaults to `false`
    * `opts.updateOptional` - If true, will update any dependent `"package.json#optionalDependencies"` fields - Defaults to `false`
    * `opts.noPush` - If true, will prevent pushing any changes to upstream / origin - Defaults to `false`
    * `opts.noChangelog` - If true, will not write CHANGELOG.md updates for each package that has changed. Defaults to `false`.
    * `opts.dryRun` - If true, will print the changes that are expected to happen at every step instead of actually writing the changes. Defaults to `false`.
  * `cwd?: string` - Defaults to `appRootPath.toString()`
---

## Get started contributing
1. Clone this repo
2. Run `./repo-setup.sh`
3. Happy hacking! ⌨️
