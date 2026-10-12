import type {ContractParameters} from './contract_parameters';
import type {OfferContract} from './offer_contract';

/**
 * An offer's config type, derived from its contract.
 *
 * - `Omitted`: contract keys not offered as config — the ones the offer fills
 *   from the component's neutral parameters (e.g. `lbScheme` from
 *   `LoadBalancer.withScheme`, which a config value would bypass, lock or not),
 *   and the ones the SDK withholds on purpose (raw secret values).
 * - `Overrides`: contract keys the SDK presents differently from the wire — a
 *   list the offer joins into the agent's comma-separated string, a sub-shape
 *   the contract only types as `object`, or simply the SDK's own docs. Each key
 *   MUST be a contract key: the constraint maps any other key to `never`, so a
 *   key the agent stops declaring fails to compile.
 *
 * A config with no keys left is `Record<string, never>`, not `{}`: TypeScript
 * accepts any object for `{}`, so `OciVcn({region})` would compile.
 */
export type ContractConfig<
  C extends OfferContract,
  Omitted extends keyof C['params'] = never,
  Overrides extends {
    [K in keyof Overrides]: K extends keyof C['params'] ? unknown : never;
  } = {},
> = [
  | keyof Omit<ContractParameters<C>, Omitted | keyof Overrides>
  | keyof Overrides,
] extends [never]
  ? Record<string, never>
  : Omit<ContractParameters<C>, Omitted | keyof Overrides> & Overrides;
