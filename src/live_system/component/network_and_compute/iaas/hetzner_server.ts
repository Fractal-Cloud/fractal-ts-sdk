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

// Agent constant: HETZNER_SERVER_COMPONENT_NAME = "HetznerServer"
const HETZNER_SERVER_TYPE_NAME = 'HetznerServer';
const SERVER_TYPE_PARAM = 'serverType';
const LOCATION_PARAM = 'location';
const IMAGE_PARAM = 'image';
const SSH_KEYS_PARAM = 'sshKeys';
const USER_DATA_PARAM = 'userData';

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

function buildHetznerServerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(HETZNER_SERVER_TYPE_NAME)
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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedHetznerServerBuilder = {
  withServerType: (serverType: string) => SatisfiedHetznerServerBuilder;
  withLocation: (location: string) => SatisfiedHetznerServerBuilder;
  withImage: (image: string) => SatisfiedHetznerServerBuilder;
  withSshKeys: (keys: string[]) => SatisfiedHetznerServerBuilder;
  withUserData: (userData: string) => SatisfiedHetznerServerBuilder;
  build: () => LiveSystemComponent;
};

export type HetznerServerBuilder = {
  withId: (id: string) => HetznerServerBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => HetznerServerBuilder;
  withDisplayName: (displayName: string) => HetznerServerBuilder;
  withDescription: (description: string) => HetznerServerBuilder;
  withServerType: (serverType: string) => HetznerServerBuilder;
  withLocation: (location: string) => HetznerServerBuilder;
  withImage: (image: string) => HetznerServerBuilder;
  withSshKeys: (keys: string[]) => HetznerServerBuilder;
  withUserData: (userData: string) => HetznerServerBuilder;
  build: () => LiveSystemComponent;
};

export type HetznerServerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  serverType: string;
  location: string;
  image: string;
  sshKeys?: string[];
  userData?: string;
};

export namespace HetznerServer {
  export const getBuilder = (): HetznerServerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildHetznerServerType())
      .withParameters(params)
      .withProvider('Hetzner');

    const builder: HetznerServerBuilder = {
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
      withServerType: value => {
        pushParam(params, SERVER_TYPE_PARAM, value);
        return builder;
      },
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return builder;
      },
      withImage: value => {
        pushParam(params, IMAGE_PARAM, value);
        return builder;
      },
      withSshKeys: value => {
        pushParam(params, SSH_KEYS_PARAM, value);
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
  ): SatisfiedHetznerServerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildHetznerServerType())
      .withParameters(params)
      .withProvider('Hetzner')
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

    if (blueprint.description) inner.withDescription(blueprint.description);

    const satisfiedBuilder: SatisfiedHetznerServerBuilder = {
      withServerType: value => {
        pushParam(params, SERVER_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return satisfiedBuilder;
      },
      withImage: value => {
        pushParam(params, IMAGE_PARAM, value);
        return satisfiedBuilder;
      },
      withSshKeys: value => {
        pushParam(params, SSH_KEYS_PARAM, value);
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

  export const create = (config: HetznerServerConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withServerType(config.serverType)
      .withLocation(config.location)
      .withImage(config.image);

    if (config.description) b.withDescription(config.description);
    if (config.sshKeys && config.sshKeys.length > 0)
      b.withSshKeys(config.sshKeys);
    if (config.userData) b.withUserData(config.userData);

    return b.build();
  };
}
