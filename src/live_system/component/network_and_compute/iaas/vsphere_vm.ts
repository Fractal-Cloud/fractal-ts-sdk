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

// Agent constant: OfferVsphereVm = "NetworkAndCompute.IaaS.VsphereVm"
const VSPHERE_VM_TYPE_NAME = 'VsphereVm';
const TEMPLATE_PARAM = 'template';
const DATACENTER_PARAM = 'datacenter';
const CLUSTER_PARAM = 'cluster';
const DATASTORE_PARAM = 'datastore';
const FOLDER_PARAM = 'folder';
const NUM_CPUS_PARAM = 'numCpus';
const MEMORY_MB_PARAM = 'memoryMb';
const DISK_SIZE_GB_PARAM = 'diskSizeGb';
const GUEST_ID_PARAM = 'guestId';
const HOSTNAME_PARAM = 'hostname';
const SSH_PUBLIC_KEY_PARAM = 'sshPublicKey';
const CLOUD_INIT_USER_DATA_PARAM = 'cloudInitUserData';
const STORAGE_POLICY_PARAM = 'storagePolicy';
const RESOURCE_POOL_PARAM = 'resourcePool';

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

function buildVsphereVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(VSPHERE_VM_TYPE_NAME).build(),
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
export type SatisfiedVsphereVmBuilder = {
  withTemplate: (template: string) => SatisfiedVsphereVmBuilder;
  withDatacenter: (datacenter: string) => SatisfiedVsphereVmBuilder;
  withCluster: (cluster: string) => SatisfiedVsphereVmBuilder;
  withDatastore: (datastore: string) => SatisfiedVsphereVmBuilder;
  withFolder: (folder: string) => SatisfiedVsphereVmBuilder;
  withNumCpus: (numCpus: number) => SatisfiedVsphereVmBuilder;
  withMemoryMb: (memoryMb: number) => SatisfiedVsphereVmBuilder;
  withDiskSizeGb: (diskSizeGb: number) => SatisfiedVsphereVmBuilder;
  withGuestId: (guestId: string) => SatisfiedVsphereVmBuilder;
  withHostname: (hostname: string) => SatisfiedVsphereVmBuilder;
  withSshPublicKey: (sshPublicKey: string) => SatisfiedVsphereVmBuilder;
  withCloudInitUserData: (userData: string) => SatisfiedVsphereVmBuilder;
  withStoragePolicy: (policy: string) => SatisfiedVsphereVmBuilder;
  withResourcePool: (pool: string) => SatisfiedVsphereVmBuilder;
  build: () => LiveSystemComponent;
};

export type VsphereVmBuilder = {
  withId: (id: string) => VsphereVmBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => VsphereVmBuilder;
  withDisplayName: (displayName: string) => VsphereVmBuilder;
  withDescription: (description: string) => VsphereVmBuilder;
  withTemplate: (template: string) => VsphereVmBuilder;
  withDatacenter: (datacenter: string) => VsphereVmBuilder;
  withCluster: (cluster: string) => VsphereVmBuilder;
  withDatastore: (datastore: string) => VsphereVmBuilder;
  withFolder: (folder: string) => VsphereVmBuilder;
  withNumCpus: (numCpus: number) => VsphereVmBuilder;
  withMemoryMb: (memoryMb: number) => VsphereVmBuilder;
  withDiskSizeGb: (diskSizeGb: number) => VsphereVmBuilder;
  withGuestId: (guestId: string) => VsphereVmBuilder;
  withHostname: (hostname: string) => VsphereVmBuilder;
  withSshPublicKey: (sshPublicKey: string) => VsphereVmBuilder;
  withCloudInitUserData: (userData: string) => VsphereVmBuilder;
  withStoragePolicy: (policy: string) => VsphereVmBuilder;
  withResourcePool: (pool: string) => VsphereVmBuilder;
  build: () => LiveSystemComponent;
};

export type VsphereVmConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  template: string;
  datacenter: string;
  cluster: string;
  datastore: string;
  folder?: string;
  numCpus?: number;
  memoryMb?: number;
  diskSizeGb?: number;
  guestId?: string;
  hostname?: string;
  sshPublicKey?: string;
  cloudInitUserData?: string;
  storagePolicy?: string;
  resourcePool?: string;
};

export namespace VsphereVm {
  export const getBuilder = (): VsphereVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVsphereVmType())
      .withParameters(params)
      .withProvider('VMware');

    const builder: VsphereVmBuilder = {
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
      withTemplate: value => {
        pushParam(params, TEMPLATE_PARAM, value);
        return builder;
      },
      withDatacenter: value => {
        pushParam(params, DATACENTER_PARAM, value);
        return builder;
      },
      withCluster: value => {
        pushParam(params, CLUSTER_PARAM, value);
        return builder;
      },
      withDatastore: value => {
        pushParam(params, DATASTORE_PARAM, value);
        return builder;
      },
      withFolder: value => {
        pushParam(params, FOLDER_PARAM, value);
        return builder;
      },
      withNumCpus: value => {
        pushParam(params, NUM_CPUS_PARAM, value);
        return builder;
      },
      withMemoryMb: value => {
        pushParam(params, MEMORY_MB_PARAM, value);
        return builder;
      },
      withDiskSizeGb: value => {
        pushParam(params, DISK_SIZE_GB_PARAM, value);
        return builder;
      },
      withGuestId: value => {
        pushParam(params, GUEST_ID_PARAM, value);
        return builder;
      },
      withHostname: value => {
        pushParam(params, HOSTNAME_PARAM, value);
        return builder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return builder;
      },
      withCloudInitUserData: value => {
        pushParam(params, CLOUD_INIT_USER_DATA_PARAM, value);
        return builder;
      },
      withStoragePolicy: value => {
        pushParam(params, STORAGE_POLICY_PARAM, value);
        return builder;
      },
      withResourcePool: value => {
        pushParam(params, RESOURCE_POOL_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedVsphereVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVsphereVmType())
      .withParameters(params)
      .withProvider('VMware')
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

    const satisfiedBuilder: SatisfiedVsphereVmBuilder = {
      withTemplate: value => {
        pushParam(params, TEMPLATE_PARAM, value);
        return satisfiedBuilder;
      },
      withDatacenter: value => {
        pushParam(params, DATACENTER_PARAM, value);
        return satisfiedBuilder;
      },
      withCluster: value => {
        pushParam(params, CLUSTER_PARAM, value);
        return satisfiedBuilder;
      },
      withDatastore: value => {
        pushParam(params, DATASTORE_PARAM, value);
        return satisfiedBuilder;
      },
      withFolder: value => {
        pushParam(params, FOLDER_PARAM, value);
        return satisfiedBuilder;
      },
      withNumCpus: value => {
        pushParam(params, NUM_CPUS_PARAM, value);
        return satisfiedBuilder;
      },
      withMemoryMb: value => {
        pushParam(params, MEMORY_MB_PARAM, value);
        return satisfiedBuilder;
      },
      withDiskSizeGb: value => {
        pushParam(params, DISK_SIZE_GB_PARAM, value);
        return satisfiedBuilder;
      },
      withGuestId: value => {
        pushParam(params, GUEST_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withHostname: value => {
        pushParam(params, HOSTNAME_PARAM, value);
        return satisfiedBuilder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return satisfiedBuilder;
      },
      withCloudInitUserData: value => {
        pushParam(params, CLOUD_INIT_USER_DATA_PARAM, value);
        return satisfiedBuilder;
      },
      withStoragePolicy: value => {
        pushParam(params, STORAGE_POLICY_PARAM, value);
        return satisfiedBuilder;
      },
      withResourcePool: value => {
        pushParam(params, RESOURCE_POOL_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: VsphereVmConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withTemplate(config.template)
      .withDatacenter(config.datacenter)
      .withCluster(config.cluster)
      .withDatastore(config.datastore);

    if (config.description) b.withDescription(config.description);
    if (config.folder) b.withFolder(config.folder);
    if (config.numCpus !== undefined) b.withNumCpus(config.numCpus);
    if (config.memoryMb !== undefined) b.withMemoryMb(config.memoryMb);
    if (config.diskSizeGb !== undefined) b.withDiskSizeGb(config.diskSizeGb);
    if (config.guestId) b.withGuestId(config.guestId);
    if (config.hostname) b.withHostname(config.hostname);
    if (config.sshPublicKey) b.withSshPublicKey(config.sshPublicKey);
    if (config.cloudInitUserData)
      b.withCloudInitUserData(config.cloudInitUserData);
    if (config.storagePolicy) b.withStoragePolicy(config.storagePolicy);
    if (config.resourcePool) b.withResourcePool(config.resourcePool);

    return b.build();
  };
}
