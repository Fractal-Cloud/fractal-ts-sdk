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

// Matches aria-agent-aruba handlers/object_storage.go: Storage.PaaS.ArubaObjectStorageAccount
const ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE_NAME = 'ArubaObjectStorageAccount';
const ACCOUNT_NAME_PARAM = 'accountName';
const PASSWORD_PARAM = 'password';
const REGION_CODE_PARAM = 'regionCode';

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
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE_NAME)
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

export type SatisfiedArubaObjectStorageAccountBuilder = {
  withAccountName: (
    accountName: string,
  ) => SatisfiedArubaObjectStorageAccountBuilder;
  withPassword: (password: string) => SatisfiedArubaObjectStorageAccountBuilder;
  withRegionCode: (
    regionCode: string,
  ) => SatisfiedArubaObjectStorageAccountBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaObjectStorageAccountBuilder = {
  withId: (id: string) => ArubaObjectStorageAccountBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaObjectStorageAccountBuilder;
  withDisplayName: (displayName: string) => ArubaObjectStorageAccountBuilder;
  withDescription: (description: string) => ArubaObjectStorageAccountBuilder;
  withAccountName: (accountName: string) => ArubaObjectStorageAccountBuilder;
  withPassword: (password: string) => ArubaObjectStorageAccountBuilder;
  withRegionCode: (regionCode: string) => ArubaObjectStorageAccountBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaObjectStorageAccountConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  accountName?: string;
  password: string;
  regionCode?: string;
};

export namespace ArubaObjectStorageAccount {
  export const getBuilder = (): ArubaObjectStorageAccountBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaObjectStorageAccountBuilder = {
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
      withAccountName: value => {
        pushParam(params, ACCOUNT_NAME_PARAM, value);
        return builder;
      },
      withPassword: value => {
        pushParam(params, PASSWORD_PARAM, value);
        return builder;
      },
      withRegionCode: value => {
        pushParam(params, REGION_CODE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaObjectStorageAccountBuilder => {
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

    const satisfiedBuilder: SatisfiedArubaObjectStorageAccountBuilder = {
      withAccountName: value => {
        pushParam(params, ACCOUNT_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withPassword: value => {
        pushParam(params, PASSWORD_PARAM, value);
        return satisfiedBuilder;
      },
      withRegionCode: value => {
        pushParam(params, REGION_CODE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: ArubaObjectStorageAccountConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withPassword(config.password);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.accountName) {
      b.withAccountName(config.accountName);
    }
    if (config.regionCode) {
      b.withRegionCode(config.regionCode);
    }

    return b.build();
  };
}
