import {BlueprintComponentType} from './component/type';
import {LiveSystemComponent} from '../live_system/component';
import {getLiveSystemComponentBuilder} from '../live_system/component/entity';
import {
  GenericParameters,
  getParametersInstance,
} from '../values/generic_parameters';
import {ComponentId} from '../component/id';
import {Version} from '../values/version';
import {BlueprintComponentDependency} from './component/dependency';
import {ComponentLink} from '../component/link';

/**
 * The book's `Offer` abstraction, expressed functionally.
 *
 * An Offer is a concrete, vendor-specific implementation that satisfies an
 * abstract component's Service. It declares its own (3-part) catalog type and the
 * Provider it runs on, and turns the abstract component's vendor-neutral
 * parameters, dependencies and links into one or more LiveSystemComponents (a
 * primary plus any vendor-specific sub-components).
 *
 * The dev never references an Offer directly — the abstract component carries a
 * set of candidate Offers and the Provider chosen at LiveSystem time selects one
 * (see {@link ../component/abstract_component}).
 */
export type OfferInstantiationContext = {
  id: ComponentId;
  version: Version;
  displayName: string;
  description: string;
  /** Vendor-neutral parameters set by the dev through the Fractal Interface. */
  neutralParameters: GenericParameters;
  /** Dependencies declared on the abstract component, inherited by the offer. */
  dependencies: BlueprintComponentDependency[];
  /** Links declared on the abstract component, inherited by the offer. */
  links: ComponentLink[];
};

export type Offer = {
  readonly type: BlueprintComponentType;
  readonly provider: LiveSystemComponent.Provider;
  /**
   * Produce the live component(s) for this offer: the primary component, plus
   * any vendor-specific sub-components (live-system-only) it requires.
   */
  instantiate: (ctx: OfferInstantiationContext) => LiveSystemComponent[];
};

/**
 * Builds the primary LiveSystemComponent for an Offer, inheriting every
 * vendor-neutral parameter, dependency and link from the abstract component.
 *
 * This is the mechanism that keeps offer-swap clean: the neutral inputs flow to
 * whichever Offer the Provider selects, so only `type`/`provider` (and any
 * vendor-only extras the offer adds) differ between offers.
 */
export function instantiateFromNeutral(
  ctx: OfferInstantiationContext,
  type: BlueprintComponentType,
  provider: LiveSystemComponent.Provider,
): LiveSystemComponent {
  const params = getParametersInstance();
  const source = ctx.neutralParameters.toMap();
  for (const key of Object.keys(source)) {
    params.push(key, source[key] as Record<string, object>);
  }

  return getLiveSystemComponentBuilder()
    .withType(type)
    .withId(ctx.id)
    .withVersion(ctx.version)
    .withDisplayName(ctx.displayName)
    .withDescription(ctx.description)
    .withProvider(provider)
    .withParameters(params)
    .withDependencies(ctx.dependencies)
    .withLinks(ctx.links)
    .build();
}
