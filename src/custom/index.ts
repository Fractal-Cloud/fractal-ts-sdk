import {getBlueprintComponentBuilder} from '../fractal/component/entity';
import {getLiveSystemComponentBuilder} from '../live_system/component/entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../fractal/component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../values/service_delivery_model';
import {PascalCaseString} from '../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../component/id';
import {KebabCaseString} from '../values/kebab_case_string';
import {getVersionBuilder, Version} from '../values/version';
import {BlueprintComponent} from '../fractal/component/index';
import {LiveSystemComponent} from '../live_system/component/index';
import {
  CustomBlueprintConfig,
  CustomBlueprintFactory,
  CustomBlueprintBuilder,
  CustomOfferConfig,
  CustomOfferFactory,
  CustomOfferBuilder,
  CustomSatisfiedBuilder,
  CustomComponentConfig,
} from './types';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildId(id: string): ComponentId {
  return getComponentIdBuilder()
    .withValue(KebabCaseString.getBuilder().withValue(id).build())
    .build();
}

function buildVersion(major: number, minor: number, patch: number): Version {
  return getVersionBuilder()
    .withMajor(major)
    .withMinor(minor)
    .withPatch(patch)
    .build();
}

function buildComponentType(
  domain: string,
  serviceDeliveryModel: string,
  name: string,
): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(domain as InfrastructureDomain)
    .withServiceDeliveryModel(serviceDeliveryModel as ServiceDeliveryModel)
    .withName(PascalCaseString.getBuilder().withValue(name).build())
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

function applyConfigParams(
  params: GenericParameters,
  configParams?: Record<string, unknown>,
): void {
  if (!configParams) return;
  for (const [key, value] of Object.entries(configParams)) {
    pushParam(params, key, value);
  }
}

function copyBlueprintParams(
  target: GenericParameters,
  source: BlueprintComponent,
): void {
  for (const key of source.parameters.getAllFieldNames()) {
    const value = source.parameters.getOptionalFieldByName(key);
    if (value !== null) pushParam(target, key, value);
  }
}

// ── Custom namespace ──────────────────────────────────────────────────────────

/**
 * Factory functions for defining custom aria component types.
 *
 * Use `Custom.blueprint()` to define a reusable blueprint component factory,
 * and `Custom.offer()` to define a reusable live system offer factory.
 *
 * @example
 * ```ts
 * import { Custom, ServiceDeliveryModel } from '@anthropic/fractal-sdk';
 *
 * // Define factories (once, reusable)
 * const TimeSeriesStore = Custom.blueprint({
 *   domain: 'Analytics',
 *   serviceDeliveryModel: ServiceDeliveryModel.PaaS,
 *   name: 'TimeSeriesStore',
 * });
 *
 * const InfluxDb = Custom.offer({
 *   domain: 'Analytics',
 *   serviceDeliveryModel: ServiceDeliveryModel.PaaS,
 *   name: 'InfluxDb',
 *   provider: 'CaaS',
 * });
 *
 * // Create blueprint component
 * const metricsDb = TimeSeriesStore.create({
 *   id: 'metrics-db',
 *   version: { major: 1, minor: 0, patch: 0 },
 *   displayName: 'Metrics Database',
 *   parameters: { retentionDays: '90' },
 * });
 *
 * // Create live system component from blueprint
 * const influx = InfluxDb.satisfy(metricsDb)
 *   .withParameter('bucket', 'metrics')
 *   .build();
 * ```
 */
export namespace Custom {
  /**
   * Define a reusable blueprint component factory for a custom component type.
   *
   * The `name` is validated as PascalCase immediately — a `SyntaxError` is
   * thrown if invalid.
   */
  export const blueprint = (
    config: CustomBlueprintConfig,
  ): CustomBlueprintFactory => {
    // Validate eagerly — fail fast on bad type name
    const componentType = buildComponentType(
      config.domain,
      config.serviceDeliveryModel,
      config.name,
    );
    const typeString = `${config.domain}.${config.serviceDeliveryModel}.${config.name}`;

    const factory: CustomBlueprintFactory = {
      typeString,

      create: (compConfig: CustomComponentConfig): BlueprintComponent => {
        const b = factory.getBuilder();
        b.withId(compConfig.id).withVersion(
          compConfig.version.major,
          compConfig.version.minor,
          compConfig.version.patch,
        );
        b.withDisplayName(compConfig.displayName);
        if (compConfig.description) b.withDescription(compConfig.description);
        if (compConfig.parameters) b.withParameters(compConfig.parameters);
        if (compConfig.dependencies)
          b.withDependencies(compConfig.dependencies);
        if (compConfig.links) b.withLinks(compConfig.links);
        return b.build();
      },

      getBuilder: (): CustomBlueprintBuilder => {
        const params = getParametersInstance();
        const inner = getBlueprintComponentBuilder()
          .withType(componentType)
          .withParameters(params);

        const builder: CustomBlueprintBuilder = {
          withId: id => {
            inner.withId(buildId(id));
            return builder;
          },
          withVersion: (major, minor, patch) => {
            inner.withVersion(buildVersion(major, minor, patch));
            return builder;
          },
          withDisplayName: displayName => {
            inner.withDisplayName(displayName);
            return builder;
          },
          withDescription: description => {
            inner.withDescription(description);
            return builder;
          },
          withParameter: (key, value) => {
            pushParam(params, key, value);
            return builder;
          },
          withParameters: paramsRecord => {
            applyConfigParams(params, paramsRecord);
            return builder;
          },
          withDependencies: deps => {
            inner.withDependencies(deps);
            return builder;
          },
          withLinks: links => {
            inner.withLinks(links);
            return builder;
          },
          withIsLocked: value => {
            inner.withIsLocked(value);
            return builder;
          },
          withRecreateOnFailure: value => {
            inner.withRecreateOnFailure(value);
            return builder;
          },
          build: () => inner.build(),
        };

        return builder;
      },
    };

    return factory;
  };

  /**
   * Define a reusable live system offer factory for a custom offer type.
   *
   * The `name` is validated as PascalCase immediately — a `SyntaxError` is
   * thrown if invalid.
   */
  export const offer = (config: CustomOfferConfig): CustomOfferFactory => {
    // Validate eagerly
    const componentType = buildComponentType(
      config.domain,
      config.serviceDeliveryModel,
      config.name,
    );
    const provider = config.provider as LiveSystemComponent.Provider;
    const typeString = `${config.domain}.${config.serviceDeliveryModel}.${config.name}`;

    const factory: CustomOfferFactory = {
      typeString,

      create: (compConfig: CustomComponentConfig): LiveSystemComponent => {
        const b = factory.getBuilder();
        b.withId(compConfig.id).withVersion(
          compConfig.version.major,
          compConfig.version.minor,
          compConfig.version.patch,
        );
        b.withDisplayName(compConfig.displayName);
        if (compConfig.description) b.withDescription(compConfig.description);
        if (compConfig.parameters) b.withParameters(compConfig.parameters);
        if (compConfig.dependencies)
          b.withDependencies(compConfig.dependencies);
        if (compConfig.links) b.withLinks(compConfig.links);
        return b.build();
      },

      getBuilder: (): CustomOfferBuilder => {
        const params = getParametersInstance();
        const inner = getLiveSystemComponentBuilder()
          .withType(componentType)
          .withParameters(params)
          .withProvider(provider);

        const builder: CustomOfferBuilder = {
          withId: id => {
            inner.withId(buildId(id));
            return builder;
          },
          withVersion: (major, minor, patch) => {
            inner.withVersion(buildVersion(major, minor, patch));
            return builder;
          },
          withDisplayName: displayName => {
            inner.withDisplayName(displayName);
            return builder;
          },
          withDescription: description => {
            inner.withDescription(description);
            return builder;
          },
          withParameter: (key, value) => {
            pushParam(params, key, value);
            return builder;
          },
          withParameters: paramsRecord => {
            applyConfigParams(params, paramsRecord);
            return builder;
          },
          withDependencies: deps => {
            inner.withDependencies(deps);
            return builder;
          },
          withLinks: links => {
            inner.withLinks(links);
            return builder;
          },
          withIsLocked: value => {
            inner.withIsLocked(value);
            return builder;
          },
          withRecreateOnFailure: value => {
            inner.withRecreateOnFailure(value);
            return builder;
          },
          build: () => inner.build(),
        };

        return builder;
      },

      satisfy: (bp: BlueprintComponent): CustomSatisfiedBuilder => {
        const params = getParametersInstance();
        const inner = getLiveSystemComponentBuilder()
          .withType(componentType)
          .withParameters(params)
          .withProvider(provider)
          .withId(buildId(bp.id.toString()))
          .withVersion(
            buildVersion(bp.version.major, bp.version.minor, bp.version.patch),
          )
          .withDisplayName(bp.displayName)
          .withDependencies(bp.dependencies)
          .withLinks(bp.links);

        if (bp.description) inner.withDescription(bp.description);

        // Copy all blueprint parameters
        copyBlueprintParams(params, bp);

        const satisfiedBuilder: CustomSatisfiedBuilder = {
          withParameter: (key, value) => {
            pushParam(params, key, value);
            return satisfiedBuilder;
          },
          withParameters: paramsRecord => {
            applyConfigParams(params, paramsRecord);
            return satisfiedBuilder;
          },
          build: () => inner.build(),
        };

        return satisfiedBuilder;
      },
    };

    return factory;
  };
}

export type {
  CustomBlueprintConfig,
  CustomBlueprintFactory,
  CustomBlueprintBuilder,
  CustomOfferConfig,
  CustomOfferFactory,
  CustomOfferBuilder,
  CustomSatisfiedBuilder,
  CustomComponentConfig,
} from './types';
