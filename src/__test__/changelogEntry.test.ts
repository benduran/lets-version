import { beforeEach, describe, expect, it } from 'vitest';

import { ChangelogEntryType, ChangelogUpdateEntry, ConventionalCommitType, GitConventional } from '../types.js';

describe('changelog entry tests', () => {
  let sampleLines: GitConventional[] = [];

  beforeEach(() => {
    sampleLines = [
      new GitConventional({
        body: 'body',
        footer: 'footer',
        header: 'header',
        type: ConventionalCommitType.TEST,
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
  });

  const customFormatter = (line: GitConventional) => `- **${line.scope}** ${line.author} ${line.subject} (${line.sha})`;

  it('should use the default formatter', () => {
    const result = new ChangelogUpdateEntry(ChangelogEntryType.FEATURES, sampleLines);
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- header (sha)');
  });

  it("should fall back to using the changelog line's subject if no header is present", () => {
    const result = new ChangelogUpdateEntry(
      ChangelogEntryType.FEATURES,
      sampleLines.map(l => {
        l.header = null;
        return l;
      }),
    );
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- subject (sha)');
  });

  it('should simply just render the commit hash if there was no parsed header or subject for the message', () => {
    const result = new ChangelogUpdateEntry(
      ChangelogEntryType.FEATURES,
      sampleLines.map(l => {
        l.header = null;
        l.subject = null;
        return l;
      }),
    );
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- (sha)');
  });

  it('should use the custom formatter', () => {
    const result = new ChangelogUpdateEntry(ChangelogEntryType.FEATURES, sampleLines, customFormatter);
    expect(result.toString()).toBe('### ✨ Features ✨\n\n- **scope** author subject (sha)');
  });
});
