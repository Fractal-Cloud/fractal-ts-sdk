import type {OfferContract} from './offer_contract';

/**
 * A parameter key of `contract`, checked twice: the type only admits the
 * contract's keys, and the call throws if the generated data lacks it. Every
 * hand-written translation names the vendor key it writes through this, so a
 * key the agent renames breaks the build instead of silently shipping a value
 * nobody reads.
 */
export const contractKey = <
  C extends OfferContract,
  K extends keyof C['params'] & string,
>(
  contract: C,
  key: K,
): K => {
  if (!Object.hasOwn(contract.params, key)) {
    throw new Error(
      `${contract.offerType} declares no parameter '${key}' ` +
        `(declared: ${Object.keys(contract.params).join(', ')}).`,
    );
  }
  return key;
};
