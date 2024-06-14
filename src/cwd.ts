import path from 'node:path';

/**
 * Given a user-provided CWD, attempts to resolve
 * it if it's relative, or leaves it as-is if it's absolute
 */
export function fixCWD(cwd: string): string {
  return path.isAbsolute(cwd) ? cwd : path.resolve(path.join(process.cwd(), cwd));
}
