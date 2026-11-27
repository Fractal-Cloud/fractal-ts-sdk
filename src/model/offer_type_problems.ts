/**
 * offer_type_problems.ts — what is wrong with a string used as an offer type.
 *
 * Shared by `defineOffer` (checked once, when the offer is defined) and
 * `liveSystemProblems` (checked for every component, before submit), so an
 * offer type is judged the same way wherever it appears.
 */
import type {DeliveryModel} from './core';
import {catalogueComponentOf} from './catalogue_component_types';
import {offerTypeEntries, offerTypeEntry} from './offer_type_registry';

const DELIVERY_MODELS: ReadonlySet<string> = new Set<DeliveryModel>([
  'IaaS',
  'PaaS',
  'CaaS',
  'SaaS',
  'FaaS',
]);

/** The delivery model an offer type names in its middle segment, if any. */
export const deliveryModelOfOfferType = (
  offerType: string,
): DeliveryModel | undefined => {
  const parts = offerType.split('.');
  return parts.length === 3 &&
    parts.every(p => p.length > 0) &&
    DELIVERY_MODELS.has(parts[1])
    ? (parts[1] as DeliveryModel)
    : undefined;
};

const quoted = (types: readonly string[]): string =>
  types.map(t => `'${t}'`).join(', ');

/** The offers defined to satisfy `abstractType` under `model`, sorted. */
const offersSatisfying = (abstractType: string, model: DeliveryModel) =>
  offerTypeEntries()
    .filter(
      e =>
        e.satisfies.has(abstractType) &&
        deliveryModelOfOfferType(e.offerType) === model,
    )
    .map(e => e.offerType)
    .sort();

/** The known offer types of `offerType`'s domain and model (else domain), sorted. */
const knownNeighbors = (offerType: string): string[] => {
  const [domain, model] = offerType.split('.');
  const known = offerTypeEntries().map(e => e.offerType);
  const sameModel = known.filter(t => t.startsWith(`${domain}.${model}.`));
  return (
    sameModel.length > 0
      ? sameModel
      : known.filter(t => t.startsWith(`${domain}.`))
  ).sort();
};

/**
 * Why `offerType` cannot be put on a component, or undefined when it can: a
 * catalogue component type in its place, a type that is not
 * `<Domain>.<DeliveryModel>.<Name>`, or one no agent declares and no offer is
 * defined on. Each answer names the valid options.
 */
export const offerTypeProblem = (offerType: string): string | undefined => {
  if (offerTypeEntry(offerType) !== undefined) {
    return undefined;
  }
  const component = catalogueComponentOf(offerType);
  if (component !== undefined) {
    const offers = offersSatisfying(component.abstractType, component.model);
    return (
      `'${offerType}' is a catalogue component type, not an offer type: a Live ` +
      'System component names the offer that implements it. ' +
      (offers.length > 0
        ? `Select one of ${quoted(offers)} for it (offers satisfying ` +
          `${component.abstractType} as ${component.model}).`
        : `No offer satisfies ${component.abstractType} as ${component.model}.`)
    );
  }
  if (deliveryModelOfOfferType(offerType) === undefined) {
    return (
      `'${offerType}' is not an offer type: an offer type is ` +
      '<Domain>.<DeliveryModel>.<Name>, with IaaS, PaaS, CaaS, SaaS or FaaS ' +
      "in the middle (e.g. 'BigData.PaaS.AzureDatabricksJob')."
    );
  }
  const neighbors = knownNeighbors(offerType);
  return (
    `'${offerType}' is an offer type no agent declares and no offer is defined ` +
    'on, so no agent would ever claim it.' +
    (neighbors.length > 0 ? ` Known offer types: ${quoted(neighbors)}.` : '')
  );
};
