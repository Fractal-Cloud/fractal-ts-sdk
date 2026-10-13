/** Counts over a validation result (`ValidationSummary`). */
export type ValidationSummary = {
  readonly errors: number;
  readonly warnings: number;
  readonly blocking: number;
  readonly unvalidatedComponents: number;
};
