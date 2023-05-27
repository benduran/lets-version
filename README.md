# lets-version
A package that reads your conventional commits and git history and recommends (or applies) a SemVer version bump for you

### NOTE: Better docs are in-progress and will be available when `lets-version` leaves `beta`!
---

## CLI Documentation
```bash
lets-version [command]

Commands:
  lets-version ls                           Shows all detected packages for this
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
                                             been updated

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```
