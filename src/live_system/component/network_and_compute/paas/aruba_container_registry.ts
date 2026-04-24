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

// Matches aria-agent-aruba handlers/container_registry.go: NetworkAndCompute.PaaS.ArubaContainerRegistry
const ARUBA_CONTAINER_REGISTRY_TYPE_NAME = 'ArubaContainerRegistry';
const SIZE_PARAM = 'size';

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

function buildType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_CONTAINER_REGISTRY_TYPE_NAME)
        .build(),
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

export type ArubaContainerRegistryBuilder = {
  withId: (id: string) => ArubaContainerRegistryBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaContainerRegistryBuilder;
  withDisplayName: (displayName: string) => ArubaContainerRegistryBuilder;
  withDescription: (description: string) => ArubaContainerRegistryBuilder;
  withSize: (size: string) => ArubaContainerRegistryBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaContainerRegistryConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  size?: string;
};

export namespace ArubaContainerRegistry {
  export const getBuilder = (): ArubaContainerRegistryBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaContainerRegistryBuilder = {
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
      withSize: value => {
        pushParam(params, SIZE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: ArubaContainerRegistryConfig,
  ): LiveSystemComponent => {
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
    if (config.size) {
      b.withSize(config.size);
    }

    return b.build();
  };
}
