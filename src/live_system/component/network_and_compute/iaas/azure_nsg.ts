import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';
import {
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
  IngressRule,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

// Agent constant: AZURE_NSG_COMPONENT_NAME = "AzureNsg"
const AZURE_NSG_TYPE_NAME = 'AzureNsg';
const LOCATION_PARAM = 'location';
const RESOURCE_GROUP_PARAM = 'resourceGroup';

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

function buildAzureNsgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_NSG_TYPE_NAME).build(),
    )
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// Re-export for consumers that import IngressRule from the live system module
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — structural properties (id, version, displayName,
 * description, dependencies, links, ingressRules) are locked to the blueprint
 * and cannot be overridden.
 */
export type SatisfiedAzureNsgBuilder = {
  withLocation: (location: string) => SatisfiedAzureNsgBuilder;
  withResourceGroup: (rg: string) => SatisfiedAzureNsgBuilder;
  build: () => LiveSystemComponent;
};

export type AzureNsgBuilder = {
  withId: (id: string) => AzureNsgBuilder;
  withVersion: (major: number, minor: number, patch: number) => AzureNsgBuilder;
  withDisplayName: (displayName: string) => AzureNsgBuilder;
  withDescription: (description: string) => AzureNsgBuilder;
  withIngressRules: (rules: IngressRule[]) => AzureNsgBuilder;
  withLocation: (location: string) => AzureNsgBuilder;
  withResourceGroup: (rg: string) => AzureNsgBuilder;
  build: () => LiveSystemComponent;
};

export type AzureNsgConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  ingressRules?: IngressRule[];
  location: string;
  resourceGroup: string;
};

export namespace AzureNsg {
  export const getBuilder = (): AzureNsgBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureNsgType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureNsgBuilder = {
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
        pushParam(params, DESCRIPTION_PARAM, description);
        return builder;
      },
      withIngressRules: rules => {
        pushParam(params, INGRESS_RULES_PARAM, rules);
        return builder;
      },
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return builder;
      },
      withResourceGroup: value => {
        pushParam(params, RESOURCE_GROUP_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureNsgBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureNsgType())
      .withParameters(params)
      .withProvider('Azure')
      .withId(buildId(blueprint.id.toString()))
      .withVersion(
        buildVersion(
          blueprint.version.major,
          blueprint.version.minor,
          blueprint.version.patch,
        ),
      )
      .withDisplayName(blueprint.displayName)
      .withDependencies(blueprint.dependencies)
      .withLinks(blueprint.links);

    const description =
      blueprint.parameters.getOptionalFieldByName(DESCRIPTION_PARAM);
    if (description !== null) {
      inner.withDescription(String(description));
      pushParam(params, DESCRIPTION_PARAM, String(description));
    } else if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    const ingressRules =
      blueprint.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM);
    if (ingressRules !== null)
      pushParam(params, INGRESS_RULES_PARAM, ingressRules as IngressRule[]);

    const satisfiedBuilder: SatisfiedAzureNsgBuilder = {
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return satisfiedBuilder;
      },
      withResourceGroup: value => {
        pushParam(params, RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AzureNsgConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withLocation(config.location)
      .withResourceGroup(config.resourceGroup);

    if (config.description) b.withDescription(config.description);
    if (config.ingressRules && config.ingressRules.length > 0)
      b.withIngressRules(config.ingressRules);

    return b.build();
  };
}
