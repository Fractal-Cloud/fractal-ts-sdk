import type {ContractDeclaration} from './contract_declaration';
import type {ContractParameter} from './contract_parameter';

/**
 * An offer's parameter contract, generated from the agents' published contracts
 * (src/model/offers/generated/). The agent is the one place an offer's
 * parameters are defined; the SDK's offer configs and the parameter keys its
 * offers emit are derived from this, so a key the agent stops reading is a
 * compile error here rather than a value nobody reads.
 */
export type OfferContract = {
  readonly offerType: string;
  readonly serviceTypes: readonly string[];
  /**
   * The offer's components may access environment secrets: every declaring
   * agent publishes `canAccessSecrets` and the `environmentSecretShortNames`
   * parameter that selects them. Absent: they may not.
   */
  readonly canAccessSecrets?: true;
  /** Every agent that declares the offer; more than one for self-hosted CaaS offers. */
  readonly declaredBy: readonly ContractDeclaration[];
  readonly params: {readonly [key: string]: ContractParameter};
};
