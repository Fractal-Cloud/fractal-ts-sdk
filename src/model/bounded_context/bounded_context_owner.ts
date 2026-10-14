/**
 * bounded_context/bounded_context_owner.ts — whose Bounded Contexts an
 * operation acts on.
 */

/**
 * `{type: 'Personal'}` is the caller's own (the account the client
 * credentials belong to); `{type: 'Organizational', ownerId}` an organization's,
 * by its GUID.
 */
export type BoundedContextOwner =
  {type: 'Personal'} | {type: 'Organizational'; ownerId: string};
