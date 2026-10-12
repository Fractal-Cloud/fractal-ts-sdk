import type {ContractValueType} from './contract_value_type';

/**
 * One parameter of an offer contract, as the agents publish it. Generated;
 * see docs/offer-contracts.md.
 */
export type ContractParameter = {
  readonly type: ContractValueType;
  /** Unconditionally required. A conditional requirement is a rule, not this flag. */
  readonly required: boolean;
  /** The value the agent applies when the key is absent. */
  readonly default?: unknown;
  /** Allowed values (for an `array`, of each item). */
  readonly values?: readonly string[];
  readonly valuesCaseInsensitive?: boolean;
  /** `warn`: a value outside `values` is reported, not refused. Default `error`. */
  readonly valuesLevel?: 'error' | 'warn';
  /** A secret: pass an environment-secret reference, never the raw value. */
  readonly sensitive?: boolean;
  /** Older keys the agent still reads for this one. */
  readonly aliases?: readonly {
    readonly key: string;
    readonly deprecated?: boolean;
  }[];
  readonly deprecated?: unknown;
  /** The agent works the value out when it is absent. */
  readonly derived?: unknown;
  readonly constraints?: unknown;
  /**
   * The agents that read the key, when the offer is declared by several agents
   * and not all of them do. Absent: every declaring agent reads it.
   */
  readonly agents?: readonly string[];
};
