import {BlueprintComponentType} from './type';
import type {Offer} from '../offer';

/**
 * A Service on a Blueprint component (the book's `BlueprintComponent.Service`).
 *
 * A Service declares a delivery-model-specific contract (its `type`, e.g.
 * `Security.PaaS.IdP`) and the set of candidate {@link Offer}s registered to
 * satisfy it. The Provider chosen at LiveSystem time selects one of these offers.
 */
export type BlueprintComponentService = {
  type: BlueprintComponentType;
  offers: Offer[];
};
