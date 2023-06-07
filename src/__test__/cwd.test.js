import path from 'path';
import { describe, expect, it } from 'vitest';

import { fixCWD } from '../cwd.js';

describe('cwd.js tests', () => {
  it('Should leave an absolute path untouched', () => {
    const abs = path.resolve('../');
    expect(abs).toBe(fixCWD(abs));
  });
  it('Should upgrade a relative path to abs', () => {
    const expected = path.resolve('../');

    expect(expected).toBe(fixCWD('../'));
  });
});
