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

// Matches aria-agent-aruba handlers/cloud_server.go: NetworkAndCompute.IaaS.ArubaCloudServer
const ARUBA_CLOUD_SERVER_TYPE_NAME = 'ArubaCloudServer';
const FLAVOR_NAME_PARAM = 'flavorName';
const BOOT_VOLUME_PARAM = 'bootVolume';
const USER_DATA_PARAM = 'userData';

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
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_CLOUD_SERVER_TYPE_NAME)
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

export type SatisfiedArubaCloudServerBuilder = {
  withFlavorName: (flavorName: string) => SatisfiedArubaCloudServerBuilder;
  withBootVolume: (bootVolume: string) => SatisfiedArubaCloudServerBuilder;
  withUserData: (userData: string) => SatisfiedArubaCloudServerBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaCloudServerBuilder = {
  withId: (id: string) => ArubaCloudServerBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaCloudServerBuilder;
  withDisplayName: (displayName: string) => ArubaCloudServerBuilder;
  withDescription: (description: string) => ArubaCloudServerBuilder;
  withFlavorName: (flavorName: string) => ArubaCloudServerBuilder;
  withBootVolume: (bootVolume: string) => ArubaCloudServerBuilder;
  withUserData: (userData: string) => ArubaCloudServerBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaCloudServerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  flavorName?: string;
  bootVolume?: string;
  userData?: string;
};

export namespace ArubaCloudServer {
  export const getBuilder = (): ArubaCloudServerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaCloudServerBuilder = {
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
      withFlavorName: value => {
        pushParam(params, FLAVOR_NAME_PARAM, value);
        return builder;
      },
      withBootVolume: value => {
        pushParam(params, BOOT_VOLUME_PARAM, value);
        return builder;
      },
      withUserData: value => {
        pushParam(params, USER_DATA_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaCloudServerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    const satisfiedBuilder: SatisfiedArubaCloudServerBuilder = {
      withFlavorName: value => {
        pushParam(params, FLAVOR_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withBootVolume: value => {
        pushParam(params, BOOT_VOLUME_PARAM, value);
        return satisfiedBuilder;
      },
      withUserData: value => {
        pushParam(params, USER_DATA_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: ArubaCloudServerConfig,
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
    if (config.flavorName) {
      b.withFlavorName(config.flavorName);
    }
    if (config.bootVolume) {
      b.withBootVolume(config.bootVolume);
    }
    if (config.userData) {
      b.withUserData(config.userData);
    }

    return b.build();
  };
}
