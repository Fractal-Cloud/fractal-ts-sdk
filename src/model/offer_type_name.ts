import type {DeliveryModel} from './core';

/**
 * The shape of an offer type: `<Domain>.<DeliveryModel>.<Name>`, e.g.
 * `BigData.PaaS.AzureDatabricksJob`. Agents dispatch on the delivery model in
 * the middle and the name at the end, so a type of another shape reaches none.
 */
export type OfferTypeName = `${string}.${DeliveryModel}.${string}`;
