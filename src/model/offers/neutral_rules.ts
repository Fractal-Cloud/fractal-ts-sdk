/**
 * offers/neutral_rules.ts — the rules an offer gives the neutral parameters
 * its agent's contract does not declare (see NeutralRule).
 */
import type {NeutralRule} from '../neutral_rule';
import type {OfferContract} from './contract/offer_contract';
import {contractKey} from './contract/contract_key';
import {contractValueProblem} from './contract/contract_value_problem';

/** Refuses a translated value the contract would not accept. */
const checked = (
  contract: OfferContract,
  out: Record<string, unknown>,
): Record<string, unknown> => {
  for (const [key, value] of Object.entries(out)) {
    if (value === undefined) {
      continue;
    }
    const problem = contractValueProblem(contract, key, value);
    if (problem !== undefined) {
      throw new Error(problem);
    }
  }
  return out;
};

/**
 * The neutral value becomes contract key `key`, through `map` when given. The
 * result must be a value the contract accepts; `map` may also throw to refuse
 * a neutral value it cannot translate.
 */
export const toContractKey = <
  C extends OfferContract,
  K extends keyof C['params'] & string,
>(
  contract: C,
  key: K,
  map: (value: unknown) => unknown = v => v,
): NeutralRule => {
  const vendorKey = contractKey(contract, key);
  return {
    kind: 'translate',
    apply: value => checked(contract, {[vendorKey]: map(value)}),
  };
};

/** The neutral value becomes several contract keys. */
export const toContractKeys = <
  C extends OfferContract,
  K extends keyof C['params'] & string,
>(
  contract: C,
  keys: readonly K[],
  map: (value: unknown) => Partial<Record<K, unknown>>,
): NeutralRule => {
  for (const key of keys) {
    contractKey(contract, key);
  }
  return {
    kind: 'translate',
    apply: value => {
      const out = map(value) as Record<string, unknown>;
      const extra = Object.keys(out).find(k => !keys.includes(k as K));
      if (extra !== undefined) {
        throw new Error(
          `${contract.offerType}: a neutral translation wrote '${extra}', not one of ${keys.join(', ')}.`,
        );
      }
      return checked(contract, out);
    },
  };
};

/** No key of the agent's contract can honor the neutral value. */
export const unsupported = (reason: string): NeutralRule => ({
  kind: 'unsupported',
  reason,
});

/** Refused unless the offer already does what the value asks (`satisfiedBy`). */
export const unsupportedUnless = (
  satisfiedBy: (value: unknown) => boolean,
  reason: string,
): NeutralRule => ({kind: 'unsupported', reason, satisfiedBy});
