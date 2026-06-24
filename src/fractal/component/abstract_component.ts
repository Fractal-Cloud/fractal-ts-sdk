import {ComponentId, getComponentIdBuilder} from '../../component/id';
import {Version, getVersionBuilder} from '../../values/version';
import {
  GenericParameters,
  getParametersInstance,
} from '../../values/generic_parameters';
import {LiveSystemComponent} from '../../live_system/component';
import {Offer} from '../offer';
import {BlueprintComponent} from './index';
import {BlueprintComponentService} from './service';
import {BlueprintComponentDependency} from './dependency';
import {ComponentLink} from '../../component/link';
import {KebabCaseString} from '../../values/kebab_case_string';
import {InfrastructureDomain} from '../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../values/service_delivery_model';
import {PascalCaseString} from '../../values/pascal_case_string';
import {getBlueprintComponentBuilder} from './entity';
import {getBlueprintComponentTypeBuilder} from './type';

/**
 * The book's abstract component, expressed functionally.
 *
 * An abstract component declares a vendor-neutral capability and the set of
 * candidate {@link Offer}s that can satisfy it. The dev sets vendor-neutral
 * parameters through the Fractal Interface (which calls `set`), and the Provider
 * chosen at LiveSystem time selects the matching Offer via `instantiate`.
 *
 * Offer-swap stays clean because the dev's specialization lives here as neutral
 * parameters, dependencies and links; swapping the Provider changes only which
 * Offer those inputs flow into.
 */
export type AbstractComponent = {
  readonly id: ComponentId;
  readonly version: Version;
  readonly displayName: string;
  readonly description: string;
  readonly parameters: GenericParameters;
  readonly dependencies: BlueprintComponentDependency[];
  readonly links: ComponentLink[];
  readonly offers: Offer[];

  /** Set a vendor-neutral parameter. Returns `this` for chaining. */
  set: (key: string, value: unknown) => AbstractComponent;

  /**
   * Select the candidate Offer for `provider` and instantiate it, returning the
   * primary live component plus any vendor sub-components.
   */
  instantiate: (
    provider: LiveSystemComponent.Provider,
  ) => LiveSystemComponent[];

  /** Serialize to a Blueprint component carrying its Service(s) + candidate offers. */
  toBlueprintComponent: () => BlueprintComponent;
};

export type AbstractComponentConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Infrastructure domain of the capability (e.g. Security, Storage). */
  domain: InfrastructureDomain;
  /** Vendor-neutral Service name (e.g. 'IdP', 'ObjectStore'). */
  serviceName: string;
  /** Candidate offers that can satisfy this capability. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

/**
 * Foundation factory for an abstract component. Every domain's abstract component
 * (IdentityProvider, ObjectStorage, ...) is a thin wrapper over this.
 */
export function createAbstractComponent(
  config: AbstractComponentConfig,
): AbstractComponent {
  if (config.offers.length === 0) {
    throw new Error(
      `Abstract component '${config.id}' must declare at least one candidate offer.`,
    );
  }

  const parameters = getParametersInstance();
  const id = getComponentIdBuilder()
    .withValue(KebabCaseString.getBuilder().withValue(config.id).build())
    .build();
  const version = getVersionBuilder()
    .withMajor(1)
    .withMinor(0)
    .withPatch(0)
    .build();
  const description = config.description ?? config.displayName;
  const dependencies = config.dependencies ?? [];
  const links = config.links ?? [];

  const serviceType = (dm: ServiceDeliveryModel) =>
    getBlueprintComponentTypeBuilder()
      .withInfrastructureDomain(config.domain)
      .withServiceDeliveryModel(dm)
      .withName(
        PascalCaseString.getBuilder().withValue(config.serviceName).build(),
      )
      .build();

  const component: AbstractComponent = {
    id,
    version,
    displayName: config.displayName,
    description,
    parameters,
    dependencies,
    links,
    offers: config.offers,

    set: (key, value) => {
      parameters.push(key, value as Record<string, object>);
      return component;
    },

    instantiate: (provider: LiveSystemComponent.Provider) => {
      const offer = config.offers.find(o => o.provider === provider);
      if (!offer) {
        throw new Error(
          `No ${config.serviceName} offer available for provider '${provider}'. ` +
            `Available providers: ${config.offers
              .map(o => o.provider)
              .join(', ')}`,
        );
      }
      return offer.instantiate({
        id,
        version,
        displayName: config.displayName,
        description,
        neutralParameters: parameters,
        dependencies,
        links,
      });
    },

    toBlueprintComponent: () => {
      // Group candidate offers by delivery model into Services.
      const byDeliveryModel = new Map<ServiceDeliveryModel, Offer[]>();
      for (const offer of config.offers) {
        const dm = offer.type.serviceDeliveryModel;
        const list = byDeliveryModel.get(dm) ?? [];
        list.push(offer);
        byDeliveryModel.set(dm, list);
      }

      const services: BlueprintComponentService[] = Array.from(
        byDeliveryModel.entries(),
      ).map(([dm, offers]) => ({type: serviceType(dm), offers}));

      return getBlueprintComponentBuilder()
        .withType(services[0].type)
        .withId(id)
        .withVersion(version)
        .withDisplayName(config.displayName)
        .withDescription(description)
        .withParameters(parameters)
        .withDependencies(dependencies)
        .withLinks(links)
        .withServices(services)
        .build();
    },
  };

  return component;
}
