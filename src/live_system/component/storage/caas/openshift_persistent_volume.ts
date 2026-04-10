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

// Agent constant: OfferPV = "Storage.CaaS.OpenshiftPersistentVolume"
const OPENSHIFT_PV_TYPE_NAME = 'OpenshiftPersistentVolume';
const NAME_PARAM = 'name';
const STORAGE_SIZE_PARAM = 'storageSize';
const STORAGE_CLASS_NAME_PARAM = 'storageClassName';
const ACCESS_MODE_PARAM = 'accessMode';
const NAMESPACE_PARAM = 'namespace';

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

function buildOpenshiftPersistentVolumeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_PV_TYPE_NAME).build(),
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
export type SatisfiedOpenshiftPersistentVolumeBuilder = {
  withName: (name: string) => SatisfiedOpenshiftPersistentVolumeBuilder;
  withStorageSize: (size: string) => SatisfiedOpenshiftPersistentVolumeBuilder;
  withStorageClassName: (
    className: string,
  ) => SatisfiedOpenshiftPersistentVolumeBuilder;
  withAccessMode: (mode: string) => SatisfiedOpenshiftPersistentVolumeBuilder;
  withNamespace: (
    namespace: string,
  ) => SatisfiedOpenshiftPersistentVolumeBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftPersistentVolumeBuilder = {
  withId: (id: string) => OpenshiftPersistentVolumeBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OpenshiftPersistentVolumeBuilder;
  withDisplayName: (displayName: string) => OpenshiftPersistentVolumeBuilder;
  withDescription: (description: string) => OpenshiftPersistentVolumeBuilder;
  withName: (name: string) => OpenshiftPersistentVolumeBuilder;
  withStorageSize: (size: string) => OpenshiftPersistentVolumeBuilder;
  withStorageClassName: (className: string) => OpenshiftPersistentVolumeBuilder;
  withAccessMode: (mode: string) => OpenshiftPersistentVolumeBuilder;
  withNamespace: (namespace: string) => OpenshiftPersistentVolumeBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftPersistentVolumeConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  name: string;
  storageSize: string;
  storageClassName?: string;
  accessMode?: string;
  namespace?: string;
};

export namespace OpenshiftPersistentVolume {
  export const getBuilder = (): OpenshiftPersistentVolumeBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftPersistentVolumeType())
      .withParameters(params)
      .withProvider('RedHat');

    const builder: OpenshiftPersistentVolumeBuilder = {
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
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withStorageSize: value => {
        pushParam(params, STORAGE_SIZE_PARAM, value);
        return builder;
      },
      withStorageClassName: value => {
        pushParam(params, STORAGE_CLASS_NAME_PARAM, value);
        return builder;
      },
      withAccessMode: value => {
        pushParam(params, ACCESS_MODE_PARAM, value);
        return builder;
      },
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOpenshiftPersistentVolumeBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftPersistentVolumeType())
      .withParameters(params)
      .withProvider('RedHat')
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

    const satisfiedBuilder: SatisfiedOpenshiftPersistentVolumeBuilder = {
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageSize: value => {
        pushParam(params, STORAGE_SIZE_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageClassName: value => {
        pushParam(params, STORAGE_CLASS_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withAccessMode: value => {
        pushParam(params, ACCESS_MODE_PARAM, value);
        return satisfiedBuilder;
      },
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: OpenshiftPersistentVolumeConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withName(config.name)
      .withStorageSize(config.storageSize);

    if (config.description) b.withDescription(config.description);
    if (config.storageClassName)
      b.withStorageClassName(config.storageClassName);
    if (config.accessMode) b.withAccessMode(config.accessMode);
    if (config.namespace) b.withNamespace(config.namespace);

    return b.build();
  };
}
