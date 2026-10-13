import type {ValidationContractRef} from './validation_contract_ref';
import type {ValidationFieldIssues} from './validation_field_issues';

/** One component's part of a validation result (`ComponentValidationResult`). */
export type ComponentValidationResult = {
  readonly componentId: string;
  readonly offerType: string | null;
  readonly provider: string | null;
  readonly contract: ValidationContractRef;
  /** False when the component was not evaluated (e.g. no contract yet). Never an error. */
  readonly validated: boolean;
  readonly unvalidatedReason:
    | 'contractUnavailable'
    | 'contractUnsupported'
    | 'noDeclaration'
    | 'parametersInvalid'
    | null;
  readonly fields: readonly ValidationFieldIssues[];
  /** Present when more than 100 issues were found: how many were left out. */
  readonly omittedIssues?: number;
};
