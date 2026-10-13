import type {ComponentValidationResult} from './component_validation_result';
import type {ValidationIssue} from './validation_issue';
import type {ValidationSummary} from './validation_summary';

/**
 * What the control plane answers when a Live System's component parameters are
 * checked against the contracts of their offers (`ParameterValidationResult`):
 * returned by `cloud.liveSystems.validate` and carried by
 * `LiveSystemValidationError`.
 */
export type ParameterValidationResult = {
  /** No issue anywhere is blocking. */
  readonly valid: boolean;
  /** Whether the control plane refuses on `error` issues (false in report mode). */
  readonly enforced: boolean;
  readonly summary: ValidationSummary;
  /** Issues of the Live System as a whole. */
  readonly liveSystemIssues: readonly ValidationIssue[];
  readonly components: readonly ComponentValidationResult[];
};
