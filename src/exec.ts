import { execaCommand, execaCommandSync } from 'execa';

export interface ExecAsyncOpts {
  cwd: string;
  stdio: 'inherit' | 'ignore' | 'pipe';
  verbose?: boolean;
}

export function execAsync(
  command: string,
  { verbose = process.env.LETS_VERSION_VERBOSE === 'true' || false, ...opts }: ExecAsyncOpts,
) {
  if (verbose) console.info('Executing', command, 'in', opts.cwd);

  return execaCommand(command, opts);
}

export function execSync(
  command: string,
  { verbose = process.env.LETS_VERSION_VERBOSE === 'true' || false, ...opts }: ExecAsyncOpts,
) {
  if (verbose) console.info('Executing', command, 'in', opts.cwd);

  return execaCommandSync(command, opts);
}
