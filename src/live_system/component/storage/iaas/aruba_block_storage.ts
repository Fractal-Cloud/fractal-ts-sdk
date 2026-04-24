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

// Matches aria-agent-aruba handlers/block_storage.go: Storage.IaaS.ArubaBlockStorage
const ARUBA_BLOCK_STORAGE_TYPE_NAME = 'ArubaBlockStorage';
const SIZE_GB_PARAM = 'sizeGb';
const TYPE_PARAM = 'type';

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
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_BLOCK_STORAGE_TYPE_NAME)
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

export type ArubaBlockStorageBuilder = {
  withId: (id: string) => ArubaBlockStorageBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaBlockStorageBuilder;
  withDisplayName: (displayName: string) => ArubaBlockStorageBuilder;
  withDescription: (description: string) => ArubaBlockStorageBuilder;
  withSizeGb: (sizeGb: number) => ArubaBlockStorageBuilder;
  withStorageType: (storageType: string) => ArubaBlockStorageBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaBlockStorageConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  sizeGb: number;
  storageType?: string;
};

export namespace ArubaBlockStorage {
  export const getBuilder = (): ArubaBlockStorageBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaBlockStorageBuilder = {
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
      withSizeGb: value => {
        pushParam(params, SIZE_GB_PARAM, value);
        return builder;
      },
      withStorageType: value => {
        pushParam(params, TYPE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: ArubaBlockStorageConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withSizeGb(config.sizeGb);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.storageType) {
      b.withStorageType(config.storageType);
    }

    return b.build();
  };
}
