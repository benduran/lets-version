import { detect } from 'package-manager-detector';

export async function getPackageManager(cwd: string) {
  const result = await detect({ cwd });
  if (!result?.name) {
    throw new Error(`failed to detect the package manager being used in ${cwd}`);
  }

  return result.name;
}
