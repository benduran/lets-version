import appRootPath from 'app-root-path';
import semver from 'semver';
import semverUtils from 'semver-utils';

import { fixCWD } from './cwd.js';
import { gitCurrentSHA } from './git.js';
import { buildLocalDependencyGraph } from './localDependencyGraph.js';
import { BumpRecommendation, BumpType, PackageInfo, ReleaseAsPresets } from './types.js';
import { isPackageJSONDependencyKeySupported } from './util.js';

/**
 * Given a parsed packageInfo object and some parameters,
 * performs a semver.inc()
 */
export async function getBumpRecommendationForPackageInfo(
  packageInfo: PackageInfo,
  from: string | null,
  bumpType: BumpType,
  parentBump?: BumpRecommendation,
  releaseAs?: ReleaseAsPresets | string,
  preid?: string,
  uniqify = false,
  cwd = appRootPath.toString(),
): Promise<BumpRecommendation> {
  const fixedCWD = fixCWD(cwd);
  const isExactRelease = Boolean(semver.coerce(releaseAs));

  let isPrerelease = false;
  let bumpTypeToUse = bumpType;
  if (isExactRelease) bumpTypeToUse = BumpType.EXACT;
  else {
    switch (releaseAs) {
      case ReleaseAsPresets.ALPHA:
      case ReleaseAsPresets.BETA:
        isPrerelease = true;
        bumpTypeToUse = BumpType.PRERELEASE;
        preid = preid || releaseAs;
        break;
      case ReleaseAsPresets.MAJOR:
        bumpTypeToUse = BumpType.MAJOR;
        break;
      case ReleaseAsPresets.MINOR:
        bumpTypeToUse = BumpType.MINOR;
        break;
      case ReleaseAsPresets.PATCH:
        bumpTypeToUse = BumpType.PATCH;
        break;
      default:
        break;
    }
  }

  if (preid) isPrerelease = true;

  const newBump = isExactRelease
    ? releaseAs
    : semver.inc(
        packageInfo.version,
        isPrerelease
          ? 'prerelease'
          : bumpTypeToUse === BumpType.PATCH
            ? 'patch'
            : bumpTypeToUse === BumpType.MINOR
              ? 'minor'
              : 'major',
        undefined,
        preid,
      );

  const fromToUse = isPrerelease || releaseAs ? packageInfo.version : from;
  let to = Boolean(fromToUse) && newBump ? newBump : packageInfo.version;

  if (uniqify) {
    to += `.${await gitCurrentSHA(fixedCWD)}`;
  }

  return new BumpRecommendation(packageInfo, fromToUse, to, bumpTypeToUse, parentBump);
}

export interface SynchronizeBumpsReturnType {
  bumps: BumpRecommendation[];
  bumpsByPackageName: Map<string, BumpRecommendation>;
  package: PackageInfo[];
}

/**
 * Applies bumps to top-level packages, then attempts to recursively
 * synchronize package versions and applies bumps if a package hasn't already
 * been bumped (but might receive one as a result from this operation)
 */
export async function synchronizeBumps(
  bumps: BumpRecommendation[],
  bumpsByPackageName: Map<string, BumpRecommendation>,
  allPackages: PackageInfo[],
  releaseAs: ReleaseAsPresets,
  preid: string | undefined,
  uniqify: boolean,
  saveExact: boolean,
  updatePeer: boolean,
  updateOptional: boolean,
  cwd = appRootPath.toString(),
) {
  const fixedCWD = fixCWD(cwd);
  const clonedBumpsByPackageName = new Map(bumpsByPackageName.entries());

  const packagesByName = new Map(bumps.map(b => [b.packageInfo.name, b.packageInfo]));

  const depGraph = await buildLocalDependencyGraph(allPackages);

  for (const bump of clonedBumpsByPackageName.values()) {
    const toWrite = packagesByName.get(bump.packageInfo.name);
    if (!toWrite) continue;
    const [existingSemver] = semverUtils.parseRange(toWrite.version);

    const existingTagDoesNotMatch = existingSemver?.release
      ? !existingSemver.release.toLowerCase().includes(bump.bumpTypeName)
      : true;

    // we want to fully respect the prerelease or "releaseAs" changeover,
    // or fallback to using the version number that's largest
    const version = existingTagDoesNotMatch || semver.gt(bump.to, toWrite.version) ? bump.to : toWrite.version;
    bump.packageInfo.version = version;
    bump.packageInfo.pkg.version = version;

    // we have the dep graph. we need to find all the packages that have the "bump"
    // package as a dependency and apply at least the same bump as the parent
    // (or defer to whichever existing bump the child has, if it's larger)

    const dependents = depGraph.filter(node => node.deps.some(dep => dep.name === bump.packageInfo.name));

    for (const dependent of dependents) {
      // we now need to update the version of the dep for each dependent,
      // ensuring we keep the correct semver range marker (if it's present)
      for (const dependentPjsonKey of Object.keys(dependent.pkg)) {
        if (!isPackageJSONDependencyKeySupported(dependentPjsonKey, updatePeer, updateOptional)) continue;

        for (const dependentDepName of Object.keys(dependent.pkg[dependentPjsonKey] ?? {})) {
          if (dependentDepName !== bump.packageInfo.name) continue;

          // @ts-expect-error - silence tsc because accessors here are safe, as we've already checked for key existence
          const existingdependentDepSemver = String(dependent.pkg[dependentPjsonKey][dependentDepName]);
          const [semverDetails] = semverUtils.parseRange(existingdependentDepSemver);

          if (!semverDetails) {
            throw new Error(
              `unable to synchronize deps because ${dependent.name} has a bad semver specified for ${dependentDepName} of ${existingdependentDepSemver}`,
            );
          }
          const { operator = '' } = semverDetails;

          let operatorTouse = operator;

          const useExactVersion =
            releaseAs === ReleaseAsPresets.ALPHA || releaseAs === ReleaseAsPresets.BETA || preid || saveExact;

          if (useExactVersion) {
            operatorTouse = '';
          } else if (
            !operatorTouse.startsWith('>=') &&
            !operatorTouse.startsWith('^') &&
            !operatorTouse.startsWith('~')
          ) {
            operatorTouse = '^';
          }

          // @ts-expect-error - silence tsc because accessors here are safe, as we've already checked for key existence
          dependent.pkg[dependentPjsonKey][dependentDepName] = `${operatorTouse}${bump.to}`;

          const existingChildBumpRec = bumpsByPackageName.get(dependent.name);
          const childBumpRec = await getBumpRecommendationForPackageInfo(
            dependent,
            dependent.version,
            Math.max(bump.type, existingChildBumpRec?.type ?? bump.type),
            bump,
            releaseAs,
            preid,
            uniqify,
            fixedCWD,
          );

          clonedBumpsByPackageName.set(childBumpRec.packageInfo.name, childBumpRec);
          const recursedResults = await synchronizeBumps(
            [childBumpRec],
            clonedBumpsByPackageName,
            allPackages,
            releaseAs,
            preid,
            uniqify,
            saveExact,
            updatePeer,
            updateOptional,
            fixedCWD,
          );

          recursedResults.bumps.forEach(b => {
            clonedBumpsByPackageName.set(b.packageInfo.name, b);
          });
        }
      }
    }
  }

  return {
    bumps: Array.from(clonedBumpsByPackageName.values()),
    bumpsByPackageName: clonedBumpsByPackageName,
    packages: Array.from(clonedBumpsByPackageName.values()).map(bump => bump.packageInfo),
  };
}
