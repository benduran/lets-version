import { describe, expect, it } from 'vitest';

import { ChangelogEntryType, ChangelogUpdateEntry, GitConventional } from '../types.js';

describe('changelog entry tests', () => {
  const sampleLines = [
    new GitConventional({
      body: 'body',
      footer: 'footer',
      header: 'header',
      type: 'type',
      scope: 'scope',
      merge: 'merge',
      notes: [{ title: 'title', text: 'text' }],
      references: ['references'],
      revert: null,
      subject: 'subject',
      sha: 'sha',
      breaking: false,
      mentions: ['mention'],
      author: 'author',
      email: 'email',
    }),
  ];

  /**
   * @param {GitConventional} line
   * @returns {string}
   */
  const customFormatter = line => `- **${line.scope}** ${line.author} ${line.subject} (${line.sha})`;

  it('should use the default formatter', () => {
    const result = new ChangelogUpdateEntry(ChangelogEntryType.FEATURES, sampleLines);
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- subject (sha)');
  });

  it('should use the custom formatter', () => {
    const result = new ChangelogUpdateEntry(ChangelogEntryType.FEATURES, sampleLines, customFormatter);
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- **scope** author subject (sha)');
  });
});
