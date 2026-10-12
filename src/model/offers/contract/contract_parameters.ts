import type {ContractValue} from './contract_value';
import type {OfferContract} from './offer_contract';

/**
 * Every parameter of an offer contract as a TypeScript object type: a key the
 * contract requires is required, every other key optional.
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
      : K
  ]?: ContractValue<C['params'][K]>;
};
