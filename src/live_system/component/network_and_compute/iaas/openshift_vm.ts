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

// Agent constant: OfferVM = "NetworkAndCompute.IaaS.OpenshiftVirtualMachine"
const OPENSHIFT_VM_TYPE_NAME = 'OpenshiftVirtualMachine';
const NAME_PARAM = 'name';
const NAMESPACE_PARAM = 'namespace';
const IMAGE_PARAM = 'image';
const CPU_CORES_PARAM = 'cpuCores';
const MEMORY_SIZE_GI_PARAM = 'memorySizeGi';
const DISK_SIZE_GI_PARAM = 'diskSizeGi';
const STORAGE_CLASS_NAME_PARAM = 'storageClassName';
const NETWORK_NAME_PARAM = 'networkName';
const CLOUD_INIT_USER_DATA_PARAM = 'cloudInitUserData';
const SSH_PUBLIC_KEY_PARAM = 'sshPublicKey';
const RUN_STRATEGY_PARAM = 'runStrategy';

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

function buildOpenshiftVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_VM_TYPE_NAME).build(),
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
export type SatisfiedOpenshiftVmBuilder = {
  withName: (name: string) => SatisfiedOpenshiftVmBuilder;
  withImage: (image: string) => SatisfiedOpenshiftVmBuilder;
  withNamespace: (namespace: string) => SatisfiedOpenshiftVmBuilder;
  withCpuCores: (cpuCores: number) => SatisfiedOpenshiftVmBuilder;
  withMemorySizeGi: (memorySizeGi: string) => SatisfiedOpenshiftVmBuilder;
  withDiskSizeGi: (diskSizeGi: string) => SatisfiedOpenshiftVmBuilder;
  withStorageClassName: (className: string) => SatisfiedOpenshiftVmBuilder;
  withNetworkName: (networkName: string) => SatisfiedOpenshiftVmBuilder;
  withCloudInitUserData: (userData: string) => SatisfiedOpenshiftVmBuilder;
  withSshPublicKey: (key: string) => SatisfiedOpenshiftVmBuilder;
  withRunStrategy: (strategy: string) => SatisfiedOpenshiftVmBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftVmBuilder = {
  withId: (id: string) => OpenshiftVmBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OpenshiftVmBuilder;
  withDisplayName: (displayName: string) => OpenshiftVmBuilder;
  withDescription: (description: string) => OpenshiftVmBuilder;
  withName: (name: string) => OpenshiftVmBuilder;
  withImage: (image: string) => OpenshiftVmBuilder;
  withNamespace: (namespace: string) => OpenshiftVmBuilder;
  withCpuCores: (cpuCores: number) => OpenshiftVmBuilder;
  withMemorySizeGi: (memorySizeGi: string) => OpenshiftVmBuilder;
  withDiskSizeGi: (diskSizeGi: string) => OpenshiftVmBuilder;
  withStorageClassName: (className: string) => OpenshiftVmBuilder;
  withNetworkName: (networkName: string) => OpenshiftVmBuilder;
  withCloudInitUserData: (userData: string) => OpenshiftVmBuilder;
  withSshPublicKey: (key: string) => OpenshiftVmBuilder;
  withRunStrategy: (strategy: string) => OpenshiftVmBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftVmConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  name: string;
  image: string;
  namespace?: string;
  cpuCores?: number;
  memorySizeGi?: string;
  diskSizeGi?: string;
  storageClassName?: string;
  networkName?: string;
  cloudInitUserData?: string;
  sshPublicKey?: string;
  runStrategy?: string;
};

export namespace OpenshiftVm {
  export const getBuilder = (): OpenshiftVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftVmType())
      .withParameters(params)
      .withProvider('RedHat');

    const builder: OpenshiftVmBuilder = {
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
      withImage: value => {
        pushParam(params, IMAGE_PARAM, value);
        return builder;
      },
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return builder;
      },
      withCpuCores: value => {
        pushParam(params, CPU_CORES_PARAM, value);
        return builder;
      },
      withMemorySizeGi: value => {
        pushParam(params, MEMORY_SIZE_GI_PARAM, value);
        return builder;
      },
      withDiskSizeGi: value => {
        pushParam(params, DISK_SIZE_GI_PARAM, value);
        return builder;
      },
      withStorageClassName: value => {
        pushParam(params, STORAGE_CLASS_NAME_PARAM, value);
        return builder;
      },
      withNetworkName: value => {
        pushParam(params, NETWORK_NAME_PARAM, value);
        return builder;
      },
      withCloudInitUserData: value => {
        pushParam(params, CLOUD_INIT_USER_DATA_PARAM, value);
        return builder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return builder;
      },
      withRunStrategy: value => {
        pushParam(params, RUN_STRATEGY_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOpenshiftVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftVmType())
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

    const satisfiedBuilder: SatisfiedOpenshiftVmBuilder = {
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withImage: value => {
        pushParam(params, IMAGE_PARAM, value);
        return satisfiedBuilder;
      },
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withCpuCores: value => {
        pushParam(params, CPU_CORES_PARAM, value);
        return satisfiedBuilder;
      },
      withMemorySizeGi: value => {
        pushParam(params, MEMORY_SIZE_GI_PARAM, value);
        return satisfiedBuilder;
      },
      withDiskSizeGi: value => {
        pushParam(params, DISK_SIZE_GI_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageClassName: value => {
        pushParam(params, STORAGE_CLASS_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withNetworkName: value => {
        pushParam(params, NETWORK_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withCloudInitUserData: value => {
        pushParam(params, CLOUD_INIT_USER_DATA_PARAM, value);
        return satisfiedBuilder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return satisfiedBuilder;
      },
      withRunStrategy: value => {
        pushParam(params, RUN_STRATEGY_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: OpenshiftVmConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withName(config.name)
      .withImage(config.image);

    if (config.description) b.withDescription(config.description);
    if (config.namespace) b.withNamespace(config.namespace);
    if (config.cpuCores !== undefined) b.withCpuCores(config.cpuCores);
    if (config.memorySizeGi) b.withMemorySizeGi(config.memorySizeGi);
    if (config.diskSizeGi) b.withDiskSizeGi(config.diskSizeGi);
    if (config.storageClassName)
      b.withStorageClassName(config.storageClassName);
    if (config.networkName) b.withNetworkName(config.networkName);
    if (config.cloudInitUserData)
      b.withCloudInitUserData(config.cloudInitUserData);
    if (config.sshPublicKey) b.withSshPublicKey(config.sshPublicKey);
    if (config.runStrategy) b.withRunStrategy(config.runStrategy);

    return b.build();
  };
}
