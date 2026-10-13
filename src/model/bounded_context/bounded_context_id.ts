/**
 * bounded_context/bounded_context_id.ts — the identity of a Bounded Context.
 */
import type {EnvironmentType} from '../environment/types';

/**
 * `type` says who owns it: `Personal` (an account, `ownerId` its id) or
 * `Organizational` (an organization, `ownerId` its GUID). `shortName` is unique
 * per owner.
 */
export type BoundedContextId = {
  type: EnvironmentType;
  ownerId: string;
  shortName: string;
};
