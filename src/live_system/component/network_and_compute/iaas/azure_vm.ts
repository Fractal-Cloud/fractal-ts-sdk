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

// BFF offer id: NetworkAndCompute.IaaS.VirtualMachine (shared across providers)
const AZURE_VM_TYPE_NAME = 'VirtualMachine';
const VM_SIZE_PARAM = 'vmSize';
const LOCATION_PARAM = 'location';
const RESOURCE_GROUP_PARAM = 'resourceGroup';
const ADMIN_USERNAME_PARAM = 'adminUsername';
const IMAGE_PUBLISHER_PARAM = 'imagePublisher';
const IMAGE_OFFER_PARAM = 'imageOffer';
const IMAGE_SKU_PARAM = 'imageSku';
const SSH_PUBLIC_KEY_PARAM = 'sshPublicKey';
const OS_DISK_SIZE_GB_PARAM = 'osDiskSizeGb';

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

function buildAzureVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_VM_TYPE_NAME).build(),
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
 * Structural properties (id, version, displayName, description, dependencies,
 * links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedAzureVmBuilder = {
  withVmSize: (vmSize: string) => SatisfiedAzureVmBuilder;
  withLocation: (location: string) => SatisfiedAzureVmBuilder;
  withResourceGroup: (rg: string) => SatisfiedAzureVmBuilder;
  withAdminUsername: (username: string) => SatisfiedAzureVmBuilder;
  withImagePublisher: (publisher: string) => SatisfiedAzureVmBuilder;
  withImageOffer: (offer: string) => SatisfiedAzureVmBuilder;
  withImageSku: (sku: string) => SatisfiedAzureVmBuilder;
  withSshPublicKey: (key: string) => SatisfiedAzureVmBuilder;
  withOsDiskSizeGb: (gb: number) => SatisfiedAzureVmBuilder;
  build: () => LiveSystemComponent;
};

export type AzureVmBuilder = {
  withId: (id: string) => AzureVmBuilder;
  withVersion: (major: number, minor: number, patch: number) => AzureVmBuilder;
  withDisplayName: (displayName: string) => AzureVmBuilder;
  withDescription: (description: string) => AzureVmBuilder;
  withVmSize: (vmSize: string) => AzureVmBuilder;
  withLocation: (location: string) => AzureVmBuilder;
  withResourceGroup: (rg: string) => AzureVmBuilder;
  withAdminUsername: (username: string) => AzureVmBuilder;
  withImagePublisher: (publisher: string) => AzureVmBuilder;
  withImageOffer: (offer: string) => AzureVmBuilder;
  withImageSku: (sku: string) => AzureVmBuilder;
  withSshPublicKey: (key: string) => AzureVmBuilder;
  withOsDiskSizeGb: (gb: number) => AzureVmBuilder;
  build: () => LiveSystemComponent;
};

export type AzureVmConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  vmSize: string;
  location: string;
  resourceGroup: string;
  adminUsername: string;
  imagePublisher: string;
  imageOffer: string;
  imageSku: string;
  sshPublicKey?: string;
  osDiskSizeGb?: number;
};

export namespace AzureVm {
  export const getBuilder = (): AzureVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureVmType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureVmBuilder = {
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
      withVmSize: value => {
        pushParam(params, VM_SIZE_PARAM, value);
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
      withAdminUsername: value => {
        pushParam(params, ADMIN_USERNAME_PARAM, value);
        return builder;
      },
      withImagePublisher: value => {
        pushParam(params, IMAGE_PUBLISHER_PARAM, value);
        return builder;
      },
      withImageOffer: value => {
        pushParam(params, IMAGE_OFFER_PARAM, value);
        return builder;
      },
      withImageSku: value => {
        pushParam(params, IMAGE_SKU_PARAM, value);
        return builder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return builder;
      },
      withOsDiskSizeGb: value => {
        pushParam(params, OS_DISK_SIZE_GB_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureVmType())
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

    if (blueprint.description) inner.withDescription(blueprint.description);

    const satisfiedBuilder: SatisfiedAzureVmBuilder = {
      withVmSize: value => {
        pushParam(params, VM_SIZE_PARAM, value);
        return satisfiedBuilder;
      },
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return satisfiedBuilder;
      },
      withResourceGroup: value => {
        pushParam(params, RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withAdminUsername: value => {
        pushParam(params, ADMIN_USERNAME_PARAM, value);
        return satisfiedBuilder;
      },
      withImagePublisher: value => {
        pushParam(params, IMAGE_PUBLISHER_PARAM, value);
        return satisfiedBuilder;
      },
      withImageOffer: value => {
        pushParam(params, IMAGE_OFFER_PARAM, value);
        return satisfiedBuilder;
      },
      withImageSku: value => {
        pushParam(params, IMAGE_SKU_PARAM, value);
        return satisfiedBuilder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return satisfiedBuilder;
      },
      withOsDiskSizeGb: value => {
        pushParam(params, OS_DISK_SIZE_GB_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AzureVmConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withVmSize(config.vmSize)
      .withLocation(config.location)
      .withResourceGroup(config.resourceGroup)
      .withAdminUsername(config.adminUsername)
      .withImagePublisher(config.imagePublisher)
      .withImageOffer(config.imageOffer)
      .withImageSku(config.imageSku);

    if (config.description) b.withDescription(config.description);
    if (config.sshPublicKey) b.withSshPublicKey(config.sshPublicKey);
    if (config.osDiskSizeGb !== undefined)
      b.withOsDiskSizeGb(config.osDiskSizeGb);

    return b.build();
  };
}
