import type {LiveSystemComponent} from '../core';

/**
 * A cross-component check an offer runs once every component of the Live System
 * has been emitted (see `Offer.validate`). Throws to refuse the Live System.
 */
export type ComponentValidator = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
) => void;
