/**
 * The component of ANOTHER Live System that a live component stands in for.
 *
 * Wire contract (the `reference` field of a Live System component):
 *   - `liveSystemId` — the owning Live System's id as the control plane writes
 *     it, `<ownerType>/<ownerId>/<boundedContext>/<liveSystemName>` (see
 *     `liveSystemIdOf`);
 *   - `componentId` — the component's id inside that Live System.
 *
 * The control plane accepts a reference only to a component in the same
 * environment and organization, that is not itself a reference, and whose type
 * equals the referencing component's. It serves the referencing component as a
 * read-only mirror of the target's parameters, output fields and status; agents
 * never reconcile it.
 */
export type ComponentReference = {
  readonly liveSystemId: string;
  readonly componentId: string;
};
