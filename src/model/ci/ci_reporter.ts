/**
 * ci/ci_reporter.ts — PORT: how a deploy talks to the CI system running it.
 *
 * Annotations (notice / warning / error) surface in the CI's run view, `mask`
 * makes the CI redact a value from every later log line, and `appendSummary`
 * adds markdown to the run's summary page. Messages are plain text; adapters
 * escape whatever their CI would read as a command.
 */
export type CiReporter = {
  notice: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  /** Redact `secret` from every later log line of this job. */
  mask: (secret: string) => void;
  /** Append markdown to the run's summary. */
  appendSummary: (markdown: string) => void;
};
