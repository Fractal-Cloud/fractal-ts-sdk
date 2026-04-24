import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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

const ARUBA_KAAS_TYPE_NAME = 'ArubaKaaS';
const KUBERNETES_VERSION_PARAM = 'kubernetesVersion';
const HA_PARAM = 'ha';
const NODE_POOL_FLAVOR_PARAM = 'nodePoolFlavor';
const NODE_POOL_COUNT_PARAM = 'nodePoolCount';
const LOCATION_PARAM = 'location';

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

function buildArubaKaaSType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_KAAS_TYPE_NAME).build(),
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

export type SatisfiedArubaKaaSBuilder = {
  withKubernetesVersion: (version: string) => SatisfiedArubaKaaSBuilder;
  withHa: (ha: boolean) => SatisfiedArubaKaaSBuilder;
  withNodePoolFlavor: (flavor: string) => SatisfiedArubaKaaSBuilder;
  withNodePoolCount: (count: number) => SatisfiedArubaKaaSBuilder;
  withLocation: (location: string) => SatisfiedArubaKaaSBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaKaaSBuilder = {
  withId: (id: string) => ArubaKaaSBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaKaaSBuilder;
  withDisplayName: (displayName: string) => ArubaKaaSBuilder;
  withDescription: (description: string) => ArubaKaaSBuilder;
  withKubernetesVersion: (version: string) => ArubaKaaSBuilder;
  withHa: (ha: boolean) => ArubaKaaSBuilder;
  withNodePoolFlavor: (flavor: string) => ArubaKaaSBuilder;
  withNodePoolCount: (count: number) => ArubaKaaSBuilder;
  withLocation: (location: string) => ArubaKaaSBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaKaaSConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  kubernetesVersion?: string;
  ha?: boolean;
  nodePoolFlavor?: string;
  nodePoolCount?: number;
  location?: string;
};

export namespace ArubaKaaS {
  export const getBuilder = (): ArubaKaaSBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaKaaSType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaKaaSBuilder = {
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
      withKubernetesVersion: version => {
        pushParam(params, KUBERNETES_VERSION_PARAM, version);
        return builder;
      },
      withHa: ha => {
        pushParam(params, HA_PARAM, ha);
        return builder;
      },
      withNodePoolFlavor: flavor => {
        pushParam(params, NODE_POOL_FLAVOR_PARAM, flavor);
        return builder;
      },
      withNodePoolCount: count => {
        pushParam(params, NODE_POOL_COUNT_PARAM, count);
        return builder;
      },
      withLocation: location => {
        pushParam(params, LOCATION_PARAM, location);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaKaaSBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaKaaSType())
      .withParameters(params)
      .withProvider('Aruba')
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

    if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    const satisfiedBuilder: SatisfiedArubaKaaSBuilder = {
      withKubernetesVersion: version => {
        pushParam(params, KUBERNETES_VERSION_PARAM, version);
        return satisfiedBuilder;
      },
      withHa: ha => {
        pushParam(params, HA_PARAM, ha);
        return satisfiedBuilder;
      },
      withNodePoolFlavor: flavor => {
        pushParam(params, NODE_POOL_FLAVOR_PARAM, flavor);
        return satisfiedBuilder;
      },
      withNodePoolCount: count => {
        pushParam(params, NODE_POOL_COUNT_PARAM, count);
        return satisfiedBuilder;
      },
      withLocation: location => {
        pushParam(params, LOCATION_PARAM, location);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ArubaKaaSConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.kubernetesVersion) {
      b.withKubernetesVersion(config.kubernetesVersion);
    }
    if (config.ha !== undefined) {
      b.withHa(config.ha);
    }
    if (config.nodePoolFlavor) {
      b.withNodePoolFlavor(config.nodePoolFlavor);
    }
    if (config.nodePoolCount !== undefined) {
      b.withNodePoolCount(config.nodePoolCount);
    }
    if (config.location) {
      b.withLocation(config.location);
    }

    return b.build();
  };
}
