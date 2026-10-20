/**
 * What an offer does with one neutral (component) parameter whose key its
 * agent's contract does not declare. Every such parameter has a rule: it is
 * translated into the contract keys the agent reads, or refused, never sent
 * under a key nobody reads (docs/offer-contracts.md). Build rules with the
 * helpers in offers/neutral_rules.ts.
 */
export type NeutralRule =
  | {
      readonly kind: 'translate';
      /** The contract keys and values the neutral value becomes; `undefined` values are skipped. */
      readonly apply: (value: unknown) => Readonly<Record<string, unknown>>;
      /**
       * Combines this value with the one an earlier neutral parameter already
       * wrote to the same key. Absent: the earlier one wins.
       */
      readonly merge?: (current: unknown, next: unknown) => unknown;
    }
  | {
      readonly kind: 'unsupported';
      /** Why no agent key can honor it, shown to the caller. */
      readonly reason: string;
      /** A value the offer satisfies anyway (e.g. a dead-letter queue it always creates). */
      readonly satisfiedBy?: (value: unknown) => boolean;
    };
