/**
 * bounded_context/bounded_context.ts — a Bounded Context as the control plane
 * holds it.
 */
import type {BoundedContextId} from './bounded_context_id';

export type BoundedContext = {
  id: BoundedContextId;
  /**
   * `Type/ownerId/shortName`: how Fractals, Live Systems and environments
   * name it (e.g. an environment's `withResourceGroup(bc.qualifiedId)`).
   */
  qualifiedId: string;
  displayName: string;
  description: string;
  icon: string | null;
  /** `Active`, or `Deleting` while it is being removed. */
  status: string;
  /** The Live Systems it holds, by id. */
  liveSystemIds: string[];
  /** The Fractals it holds, by id. */
  fractalIds: string[];
};
