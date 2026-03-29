import {BlueprintComponent} from '../fractal/component';
import {LiveSystemComponent} from '../live_system/component';
import {ComponentLink} from '../component/link';
import {BlueprintComponentDependency} from '../fractal/component/dependency';

/**
 * Configuration for defining a custom blueprint component factory.
 * The factory can then be reused to create multiple instances of that
 * component type.
 */
export type CustomBlueprintConfig = {
  /** Infrastructure domain (e.g. `'Analytics'`, or a built-in like `InfrastructureDomain.Storage`). */
  domain: string;
  /** Service delivery model (e.g. `ServiceDeliveryModel.PaaS`, or a custom string). */
  serviceDeliveryModel: string;
  /** PascalCase component name (e.g. `'TimeSeriesStore'`). Validated immediately. */
  name: string;
};

/**
 * Configuration for defining a custom live system offer factory.
 */
export type CustomOfferConfig = {
  /** Infrastructure domain. */
  domain: string;
  /** Service delivery model. */
  serviceDeliveryModel: string;
  /** PascalCase offer name (e.g. `'InfluxDb'`). Validated immediately. */
  name: string;
  /** Cloud provider (e.g. `'AWS'`, `'CaaS'`, or a custom string). */
  provider: string;
};

/**
 * Configuration for creating a single custom component instance.
 */
export type CustomComponentConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  parameters?: Record<string, unknown>;
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

/**
 * A reusable factory for creating custom blueprint components of a specific type.
 * Returned by {@link Custom.blueprint}.
 *
 * @example
 * ```ts
 * const TimeSeriesStore = Custom.blueprint({
 *   domain: 'Analytics',
 *   serviceDeliveryModel: ServiceDeliveryModel.PaaS,
 *   name: 'TimeSeriesStore',
 * });
 *
 * const tsdb = TimeSeriesStore.create({
 *   id: 'metrics-db',
 *   version: { major: 1, minor: 0, patch: 0 },
 *   displayName: 'Metrics Database',
 *   parameters: { retentionDays: '90' },
 * });
 * ```
 */
export type CustomBlueprintFactory = {
  /** Create a blueprint component with the given configuration. */
  create(config: CustomComponentConfig): BlueprintComponent;
  /** Get a fluent builder for more advanced construction. */
  getBuilder(): CustomBlueprintBuilder;
  /** The full type string, e.g. `"Analytics.PaaS.TimeSeriesStore"`. */
  readonly typeString: string;
};

/**
 * Fluent builder for custom blueprint components.
 * Pre-configured with the component type from the factory.
 */
export type CustomBlueprintBuilder = {
  withId(id: string): CustomBlueprintBuilder;
  withVersion(
    major: number,
    minor: number,
    patch: number,
  ): CustomBlueprintBuilder;
  withDisplayName(displayName: string): CustomBlueprintBuilder;
  withDescription(description: string): CustomBlueprintBuilder;
  withParameter(key: string, value: unknown): CustomBlueprintBuilder;
  withParameters(params: Record<string, unknown>): CustomBlueprintBuilder;
  withDependencies(
    deps: BlueprintComponentDependency[],
  ): CustomBlueprintBuilder;
  withLinks(links: ComponentLink[]): CustomBlueprintBuilder;
  withIsLocked(value: boolean): CustomBlueprintBuilder;
  withRecreateOnFailure(value: boolean): CustomBlueprintBuilder;
  build(): BlueprintComponent;
};

/**
 * A reusable factory for creating custom live system offer components.
 * Returned by {@link Custom.offer}.
 *
 * @example
 * ```ts
 * const InfluxDb = Custom.offer({
 *   domain: 'Analytics',
 *   serviceDeliveryModel: ServiceDeliveryModel.PaaS,
 *   name: 'InfluxDb',
 *   provider: 'CaaS',
 * });
 *
 * // Satisfy a blueprint component:
 * const influx = InfluxDb.satisfy(metricsDb)
 *   .withParameter('bucket', 'metrics')
 *   .build();
 * ```
 */
export type CustomOfferFactory = {
  /** Create a live system component with the given configuration. */
  create(config: CustomComponentConfig): LiveSystemComponent;
  /** Get a fluent builder for more advanced construction. */
  getBuilder(): CustomOfferBuilder;
  /**
   * Initialise from a blueprint component. Returns a sealed builder that
   * locks structural fields (id, version, displayName, description,
   * dependencies, links, and blueprint parameters) and only exposes
   * vendor-specific parameter setters.
   */
  satisfy(blueprint: BlueprintComponent): CustomSatisfiedBuilder;
  /** The full type string, e.g. `"Analytics.PaaS.InfluxDb"`. */
  readonly typeString: string;
};

/**
 * Fluent builder for custom live system offer components.
 * Pre-configured with the component type and provider from the factory.
 */
export type CustomOfferBuilder = {
  withId(id: string): CustomOfferBuilder;
  withVersion(major: number, minor: number, patch: number): CustomOfferBuilder;
  withDisplayName(displayName: string): CustomOfferBuilder;
  withDescription(description: string): CustomOfferBuilder;
  withParameter(key: string, value: unknown): CustomOfferBuilder;
  withParameters(params: Record<string, unknown>): CustomOfferBuilder;
  withDependencies(deps: BlueprintComponentDependency[]): CustomOfferBuilder;
  withLinks(links: ComponentLink[]): CustomOfferBuilder;
  withIsLocked(value: boolean): CustomOfferBuilder;
  withRecreateOnFailure(value: boolean): CustomOfferBuilder;
  build(): LiveSystemComponent;
};

/**
 * Sealed builder returned by {@link CustomOfferFactory.satisfy}.
 * Only vendor-specific parameters can be set — structural fields are
 * locked to the blueprint.
 */
export type CustomSatisfiedBuilder = {
  withParameter(key: string, value: unknown): CustomSatisfiedBuilder;
  withParameters(params: Record<string, unknown>): CustomSatisfiedBuilder;
  build(): LiveSystemComponent;
};
