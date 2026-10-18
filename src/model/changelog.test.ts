/**
 * changelog.test.ts — the 2.13.0 Breaking list names every wire change a
 * consumer matching on emitted types or keys must act on.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

/** The text of `### Breaking — what to change when upgrading` under `## 2.13.0`. */
const breaking2130 = (): string => {
  const text = readFileSync('CHANGELOG.md', 'utf8');
  const release = text.slice(text.indexOf('\n## 2.13.0\n'));
  const start = release.indexOf('### Breaking — what to change when upgrading');
  const end = release.indexOf('\n### ', start + 1);
  return release.slice(start, end);
};

describe('CHANGELOG 2.13.0 Breaking list', () => {
  it('names the HetznerServer offer type rename and its region-to-location key rename', () => {
    const list = breaking2130();
    expect(list).toContain('NetworkAndCompute.IaaS.HetznerServer');
    expect(list).toContain('NetworkAndCompute.IaaS.HetznerCloudServer');
    expect(list).toMatch(/`region`[^.]*sent as `location`/);
  });
});
