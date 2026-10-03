/**
 * reference.ts — cross-Live-System references.
 *
 * A Domain Service's Live System runs on a cluster, a DBMS and a gateway that a
 * shared platform Live System owns, and subscribes to topics other Domain
 * Services own. Such a slot is filled with `referenceTo(offer, {liveSystemId,
 * componentId})` in place of an offer:
 *
 *   select: {
 *     cluster: referenceTo(Eks, {liveSystemId: platform, componentId: 'eks'}),
 *     service: K8sWorkload({namespace: 'fractal'}),
 *   }
 *
 * The slot is emitted under its LOCAL id, with the offer's type, provider and
 * delivery model and the `reference`, and with no parameters, dependencies or
 * links: the control plane mirrors the target's parameters, output fields and
 * status onto it, read-only, and no agent ever reconciles it. Everything else in
 * the Live System that depends on or links to the slot names the local id, so
 * the existing dependency and link wiring works through it unchanged.
 */
import type {
  InstantiationContext,
  LiveSystemComponent,
  Offer,
  OwnerRef,
} from './core';
import type {ComponentReference} from './component_reference';

const isBlank = (value: string | undefined): boolean =>
  value === undefined || value.trim() === '';

/**
 * The id the control plane gives a Live System:
 * `<ownerType>/<ownerId>/<boundedContext>/<liveSystemName>`, e.g.
 * `Organizational/<org-uuid>/platform/shared-platform`.
 *
 * @param boundedContext the Bounded Context that owns the Live System (the
 *   `boundedContextId` its Fractal was created with).
 * @param liveSystemName the name the Live System was deployed under.
 */
export const liveSystemIdOf = (
  boundedContext: OwnerRef,
  liveSystemName: string,
): string => {
  const segments = [
    boundedContext.ownerType,
    boundedContext.ownerId,
    boundedContext.name,
    liveSystemName,
  ];
  if (segments.some(s => isBlank(s) || s!.includes('/'))) {
    throw new Error(
      'A Live System id needs an owner type, an owner id, a bounded context name ' +
        `and a Live System name, none blank or holding '/': got [${segments
          .map(s => `'${s ?? ''}'`)
          .join(', ')}].`,
    );
  }
  return segments.join('/');
};

const ensureValidReference = (ref: ComponentReference): void => {
  const segments = ref.liveSystemId.split('/');
  if (segments.length !== 4 || segments.some(s => isBlank(s))) {
    throw new Error(
      `Reference liveSystemId '${ref.liveSystemId}' is not a Live System id: it ` +
        'must be <ownerType>/<ownerId>/<boundedContext>/<liveSystemName> ' +
        '(build it with liveSystemIdOf).',
    );
  }
  if (isBlank(ref.componentId) || ref.componentId.includes('/')) {
    throw new Error(
      `Reference componentId '${ref.componentId}' must be the id of a component ` +
        "in that Live System: not blank and without '/'.",
    );
  }
};

/**
 * Refuse what a referenced slot cannot carry. Its parameters and dependencies
 * belong to the owning Live System and are dropped by design, but an outbound
 * link or an application-added child would be silently lost: nothing reconciles
 * a reference, so neither would ever be acted on.
 */
const ensureNothingIsLost = (ctx: InstantiationContext): void => {
  if (ctx.links.length > 0) {
    throw new Error(
      `'${ctx.id}' is a reference to a component of another Live System, but it ` +
        `links to [${ctx.links.map(l => l.componentId).join(', ')}]. A reference ` +
        'is never reconciled here, so its links would never be acted on: declare ' +
        'the link on the other side, or in the Live System that owns the component.',
    );
  }
  if (ctx.children.length > 0) {
    throw new Error(
      `'${ctx.id}' is a reference to a component of another Live System, but the ` +
        `application added children [${ctx.children.map(c => c.id).join(', ')}] ` +
        'under it, which only its own offer can emit. Make each child a top-level ' +
        `component that depends on '${ctx.id}' instead.`,
    );
  }
};

/**
 * Fill a blueprint slot with a component of another Live System instead of an
 * offer. `offer` names the target's offer (configured, or its constructor) and
 * must satisfy the slot's Component, exactly as an ordinary selection must; its
 * configuration is never sent.
 */
export const referenceTo = <C extends string>(
  offer: Offer<C, unknown> | ((config: never) => Offer<C, unknown>),
  reference: ComponentReference,
): Offer<C, ComponentReference> => {
  ensureValidReference(reference);
  // An offer constructor only records its configuration, so building one with an
  // empty configuration is enough to read its type; that configuration is unused.
  const target =
    typeof offer === 'function' ? offer({} as never) : (offer as Offer<C>);
  const frozen: ComponentReference = {
    liveSystemId: reference.liveSystemId,
    componentId: reference.componentId,
  };
  return {
    satisfies: target.satisfies,
    offerType: target.offerType,
    provider: target.provider,
    deliveryModel: target.deliveryModel,
    config: frozen,
    instantiate: (ctx): LiveSystemComponent[] => {
      ensureNothingIsLost(ctx);
      const component: LiveSystemComponent = {
        id: ctx.id,
        displayName: ctx.displayName,
        type: target.offerType,
        deliveryModel: target.deliveryModel,
        reference: {...frozen},
        parameters: {},
        dependencies: [],
        links: [],
      };
      return [
        target.provider === undefined
          ? component
          : {...component, provider: target.provider},
      ];
    },
  };
};
