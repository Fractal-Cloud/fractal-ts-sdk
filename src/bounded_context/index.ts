import {
  BoundedContextId,
  BoundedContextIdBuilder,
  getBoundedContextIdBuilder,
} from './id';
import {BoundedContextBuilder, getBoundedContextBuilder} from './entity';

export namespace BoundedContext {
  export type Id = BoundedContextId;
  export namespace Id {
    export type Builder = BoundedContextIdBuilder;
    export const getBuilder = getBoundedContextIdBuilder;
  }
  export type Builder = BoundedContextBuilder;
  export const getBuilder = getBoundedContextBuilder;
}

/**
 * A Bounded Context in Fractal Cloud is the mechanism that:
 * - Maps infrastructure to business domains
 * - Defines ownership and access boundaries
 * - Enables self-service without sacrificing control
 * - Allows large organizations to scale Fractal usage safely
 *
 * @typedef {Object} BoundedContext
 * @property {BoundedContext.Id} id - A unique identifier for the bounded context.
 * @property {string} displayName - A human-readable name for the bounded context.
 * @property {string} [description] - An optional description providing additional details about the bounded context's purpose or scope.
 */
export type BoundedContext = {
  id: BoundedContext.Id;
  displayName: string;
  description?: string;
};
