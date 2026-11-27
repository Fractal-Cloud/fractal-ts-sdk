/**
 * What the SDK knows about one offer type: the wire value of a Live System
 * component's `type`, which an agent dispatches on with a literal lookup.
 */
export type OfferTypeEntry = {
  readonly offerType: string;
  /** The providers an agent declares it under, or an offer defined on it names. */
  readonly providers: ReadonlySet<string>;
  /** The abstract components the offers defined on it satisfy. */
  readonly satisfies: ReadonlySet<string>;
};
