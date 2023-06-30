import { execaCommand, execaCommandSync } from 'execa';

/**
 * @typedef {Object} ExecAsyncOpts
 *
 * @property {string} cwd
 * @property {'inherit' | 'ignore' | 'pipe'} stdio
 * @property {boolean} [verbose=false]
 */

/**
 * @param {string} command
 * @param {ExecAsyncOpts} opts
 */
export function execAsync(command, opts) {
  const verbose = process.env.LETS_VERSION_VERBOSE === 'true' || opts?.verbose || false;

  if (verbose) console.info('Executing', command, 'in', opts?.cwd);

  return execaCommand(command, opts);
}

/**
 * @param {string} command
 * @param {ExecAsyncOpts} opts
 */
export function execSync(command, opts) {
  const verbose = process.env.LETS_VERSION_VERBOSE === 'true' || opts?.verbose || false;

  if (verbose) console.info('Executing', command, 'in', opts?.cwd);

  return execaCommandSync(command, opts);
}
