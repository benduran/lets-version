import path from 'path';
import { fileURLToPath } from 'url';

import { gitCommitsSince } from './git.mjs';
import { parseToConventional } from './parser.mjs';

export { gitCommitsSince, parseToConventional };

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../turbo-tools');

const commits = gitCommitsSince('', __dirname);
const parsed = parseToConventional(commits);

console.info(JSON.stringify(parsed, null, 2));
