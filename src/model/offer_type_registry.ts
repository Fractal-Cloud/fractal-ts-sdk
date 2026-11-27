/**
 * offer_type_registry.ts — every offer type the SDK can put on a Live System
 * component: each type an agent publishes a contract for (offers/generated/),
 * plus each type an offer is defined on with `defineOffer`, built-in or the
 * caller's own (the documented extension).
 *
 * A component whose type is none of these reaches no agent: the control plane
 * stores it unchecked and every agent skips it, so it sits in Instantiating
 * with nothing said. `liveSystemProblems` refuses one before it is submitted.
 */
import type {OfferContract} from './offers/contract/offer_contract';
import type {OfferTypeEntry} from './offer_type_entry';
import * as ai from './offers/generated/ai';
import * as apiManagement from './offers/generated/api_management';
import * as bigData from './offers/generated/big_data';
import * as customWorkloads from './offers/generated/custom_workloads';
import * as messaging from './offers/generated/messaging';
import * as networkAndCompute from './offers/generated/network_and_compute';
import * as observability from './offers/generated/observability';
import * as security from './offers/generated/security';
import * as storage from './offers/generated/storage';

type MutableEntry = {
  offerType: string;
  providers: Set<string>;
  satisfies: Set<string>;
};

const entries = new Map<string, MutableEntry>();

const entryFor = (offerType: string): MutableEntry => {
  let entry = entries.get(offerType);
  if (entry === undefined) {
    entry = {offerType, providers: new Set(), satisfies: new Set()};
    entries.set(offerType, entry);
  }
  return entry;
};

const isContract = (value: unknown): value is OfferContract =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as OfferContract).offerType === 'string' &&
  Array.isArray((value as OfferContract).declaredBy);

for (const module of [
  ai,
  apiManagement,
  bigData,
  customWorkloads,
  messaging,
  networkAndCompute,
  observability,
  security,
  storage,
]) {
  for (const value of Object.values(module)) {
    if (!isContract(value)) {
      continue;
    }
    const entry = entryFor(value.offerType);
    for (const declaration of value.declaredBy) {
      entry.providers.add(declaration.provider);
    }
  }
}

/** Record an offer defined with `defineOffer`. */
export const registerOfferType = (
  offerType: string,
  satisfies: string,
  provider: string | undefined,
): void => {
  const entry = entryFor(offerType);
  entry.satisfies.add(satisfies);
  if (provider !== undefined) {
    entry.providers.add(provider);
  }
};

/** What the SDK knows about `offerType`, or undefined when it knows nothing. */
export const offerTypeEntry = (offerType: string): OfferTypeEntry | undefined =>
  entries.get(offerType);

/** Every offer type the SDK knows. */
export const offerTypeEntries = (): readonly OfferTypeEntry[] => [
  ...entries.values(),
];
