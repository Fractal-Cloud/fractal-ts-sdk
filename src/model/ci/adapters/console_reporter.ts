/**
 * ci/adapters/console_reporter.ts — ADAPTER: the no-CI fallback, plain console
 * lines. A terminal cannot redact, so `mask` does nothing; nothing in this SDK
 * prints a token or secret in the first place.
 */
import type {CiReporter} from '../ci_reporter';

export const consoleReporter = (): CiReporter => ({
  notice: m => console.log(`NOTICE  ${m}`),
  warning: m => console.log(`WARNING ${m}`),
  error: m => console.log(`ERROR   ${m}`),
  mask: () => undefined,
  appendSummary: markdown => console.log(markdown),
});
