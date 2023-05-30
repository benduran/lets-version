import { describe, expect, it } from 'vitest';

import { conventionalCommitToBumpType, parseToConventional } from '../parser.mjs';
import { BumpType, GitCommit } from '../types.mjs';

describe('parser.mjs tests', () => {
  const sampleCommits = [
    new GitCommit('John Doe', '2023-05-29', 'john@example.com', 'feat: add new feature', 'abcdef123456'),
    new GitCommit('Jane Doe', '2023-05-28', 'jane@example.com', 'fix: resolve issue', 'fedcba654321'),
    new GitCommit('Jane Doe', '2023-05-28', 'jane@example.com', 'feat!(datepicker): rewrote API', '123maiomsdoim234'),
    new GitCommit(
      'John Doe',
      '2023-05-27',
      'john@example.com',
      'BREAKING CHANGE: refactored entire module',
      '123abc456def',
    ),
  ];

  it('parseToConventional should correctly parse conventional commits', () => {
    const result = parseToConventional(sampleCommits);
    expect(result.length).toBe(sampleCommits.length);
    result.forEach((commit, i) => {
      expect(commit.author).toBe(sampleCommits[i]?.author);
      expect(commit.date).toBe(sampleCommits[i]?.date);
      expect(commit.email).toBe(sampleCommits[i]?.email);
      expect(commit.message).toBe(sampleCommits[i]?.message);
      expect(commit.sha).toBe(sampleCommits[i]?.sha);
    });

    it('conventionalCommitToBumpType should correctly determine bump type', () => {
      const result = parseToConventional(sampleCommits);

      const bumpTypes = result.map(conventionalCommitToBumpType);

      expect(bumpTypes[0]).toBe(BumpType.MINOR);
      expect(bumpTypes[1]).toBe(BumpType.PATCH);
      expect(bumpTypes[2]).toBe(BumpType.MAJOR);
    });
  });
});
