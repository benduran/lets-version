import path from 'path';

/**
 * Given a user-provided CWD, attempts to resolve
 * it if it's relative, or leaves it as-is if it's absolute
 *
 * @param {string} cwd
 *
 * @returns {string}
 */
export function fixCWD(cwd) {
  return path.isAbsolute(cwd) ? cwd : path.resolve(path.join(process.cwd(), cwd));
}
