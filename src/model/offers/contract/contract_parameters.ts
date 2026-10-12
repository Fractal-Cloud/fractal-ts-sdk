import type {ContractValue} from './contract_value';
import type {OfferContract} from './offer_contract';

/**
 * Every parameter of an offer contract as a TypeScript object type: a key the
 * contract requires is required, every other key optional.
 *
 * An offer several agents declare (`declaredBy` longer than one) may be
 * reconciled by any of them, so an optional key only some of them read (the
 * parameter carries `agents`) is left out: offering it would widen the offer
 * past what the agent that ends up reconciling it reads. A key some agent
 * requires stays, since that agent cannot work without it.
 */
export type ContractParameters<C extends OfferContract> = {
  -readonly [
    K in keyof C['params'] as C['params'][K] extends {
      readonly required: true;
    }
      ? K
      : never
  ]: ContractValue<C['params'][K]>;
} & {
  -readonly [
    K in keyof C['params'] as C['params'][K] extends {
      readonly required: true;
    }
      ? never
      : C['params'][K] extends {readonly agents: readonly string[]}
        ? never
        : K
  ]?: ContractValue<C['params'][K]>;
};
