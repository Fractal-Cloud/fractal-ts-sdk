/**
 * bounded_context/bounded_context_definition.ts — what `cloud.boundedContexts.create`
 * writes.
 */
import type {BoundedContextOwner} from './bounded_context_owner';

/**
 * A Bounded Context to create, or to update in place when the owner already
 * has one with this `shortName`. A new organizational `shortName` is lower-case
 * letters, digits and `-`, at most 30 characters: it becomes part of the id
 * every Live System in it carries into its cloud resources' tags. `description`
 * and `icon` keep their stored values when omitted.
 */
export type BoundedContextDefinition = BoundedContextOwner & {
  shortName: string;
  displayName: string;
  description?: string;
  icon?: string;
};
