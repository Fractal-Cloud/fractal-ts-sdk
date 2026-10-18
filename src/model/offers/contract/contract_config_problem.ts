import type {OfferContract} from './offer_contract';
import {parameterValueProblem} from './contract_value_problem';
import {isSecretRef} from '../../secret';

/**
 * Why the parameters an offer emits for its own offer type are not ones its
 * contract accepts, or undefined when they are: each declared key's type,
 * closed vocabulary and value constraints. This is the only check of single
 * parameter values the SDK makes: value constraints come from the agents'
 * published contracts, not from hand-written per-offer checks.
 *
 * A key the contract requires is required by the offer's config type
 * (`ContractConfig`); it is not re-checked here, because the control plane may
 * still supply it (IPAM fills a subnet's `cidrBlock`) and validates required
 * keys itself before deploy.
 *
 * A key the contract does not declare is left alone here (see
 * contracts/undeclared-parameters.json), an environment-secret reference is
 * accepted for any key (the agent resolves it before reading the value), and a
 * blank string is read as unset, as the agents read it.
 */
/**
 * A blank string for a string key: the agents read it as unset (the catalog
 * ships every unset key as ''), so it is not held to the key's pattern.
 */
const isBlankText = (value: unknown, type: string | undefined): boolean =>
  type === 'string' && typeof value === 'string' && value.trim() === '';

export const contractConfigProblem = (
  contract: OfferContract,
  parameters: Readonly<Record<string, unknown>>,
): string | undefined => {
  for (const [key, value] of Object.entries(parameters)) {
    if (
      value === undefined ||
      isSecretRef(value) ||
      isBlankText(value, contract.params[key]?.type) ||
      !Object.hasOwn(contract.params, key)
    ) {
      continue;
    }
    const problem = parameterValueProblem(key, contract.params[key], value);
    if (problem !== undefined) {
      return problem;
    }
  }
  return undefined;
};
