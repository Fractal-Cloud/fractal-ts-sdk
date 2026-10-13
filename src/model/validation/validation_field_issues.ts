import type {ValidationIssue} from './validation_issue';

/** The issues of one parameter of a component (`ValidationFieldIssues`). */
export type ValidationFieldIssues = {
  /** JSON pointer (RFC 6901) of the parameter to change. */
  readonly field: string;
  readonly issues: readonly ValidationIssue[];
};
