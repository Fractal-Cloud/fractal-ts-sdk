/**
 * ci/ci.ts — the CI a deploy runs in: its identity, its reporter, and the
 * variables (secrets included) it hands the job. Built by {@link detectCi}, or
 * assembled by hand from any adapters, including a caller's own.
 */
import type {CiIdentity} from './ci_identity';
import type {CiName} from './ci_name';
import type {CiReporter} from './ci_reporter';

export type Ci = {
  readonly name: CiName | (string & {});
  readonly identity: CiIdentity;
  readonly reporter: CiReporter;
  /**
   * A variable the CI passed to the job (a mapped secret included), or
   * `undefined` when it is absent or empty — CI systems render an unmapped
   * secret as an empty string.
   */
  variable: (name: string) => string | undefined;
};
