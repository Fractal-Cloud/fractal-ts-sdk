import type {ValidationFix} from './validation_fix';

/** One failed check (`ValidationIssue`). */
export type ValidationIssue = {
  readonly severity: 'error' | 'warn';
  /** True only for an `error` the control plane enforces: the deploy is refused. */
  readonly blocking: boolean;
  /** `required`, `type`, `values`, `requiredIf`, `unknownParameter`, ... */
  readonly code: string;
  readonly ruleId: string | null;
  /** JSON pointer of the parameter, e.g. `/pythonFile`; null on Live System issues. */
  readonly field: string | null;
  readonly relatedFields: readonly string[];
  readonly detail: string | null;
  readonly message: string;
  readonly fix: ValidationFix;
  readonly docsUrl: string | null;
};
