import type {OfferContract} from './offer_contract';

/**
 * Every parameter key of `contract`, as an object from key to itself. A
 * hand-written translation that touches many keys names them as
 * `keys.containerImage` rather than `'containerImage'`, so a key the agent
 * stops declaring is a compile error.
 */
export const contractKeys = <C extends OfferContract>(
  contract: C,
): {readonly [K in keyof C['params'] & string]: K} =>
  Object.fromEntries(Object.keys(contract.params).map(k => [k, k])) as {
    readonly [K in keyof C['params'] & string]: K;
  };
