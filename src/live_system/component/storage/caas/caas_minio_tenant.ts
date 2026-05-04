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

// Agent offer: Storage.CaaS.MinioTenant — provisions a MinIO Tenant CR on a
// running Kubernetes cluster (typically a managed KaaS like Aruba KaaS) and
// exposes an S3-compatible endpoint that satisfies the abstract Datalake
// blueprint via the catalogue's service ancestry.
const MINIO_TENANT_TYPE_NAME = 'MinioTenant';
const NAMESPACE_PARAM = 'namespace';
const TENANT_NAME_PARAM = 'tenantName';
const BUCKET_NAME_PARAM = 'bucketName';
const MINIO_VERSION_PARAM = 'minioVersion';
const SERVERS_PARAM = 'servers';
const VOLUMES_PER_SERVER_PARAM = 'volumesPerServer';
const VOLUME_SIZE_PARAM = 'volumeSize';
const STORAGE_CLASS_PARAM = 'storageClass';
const REQUEST_AUTO_CERT_PARAM = 'requestAutoCert';

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

function buildMinioTenantType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(MINIO_TENANT_TYPE_NAME).build(),
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

export type SatisfiedCaaSMinioTenantBuilder = {
  withNamespace: (ns: string) => SatisfiedCaaSMinioTenantBuilder;
  withTenantName: (name: string) => SatisfiedCaaSMinioTenantBuilder;
  withBucketName: (bucket: string) => SatisfiedCaaSMinioTenantBuilder;
  withMinioVersion: (version: string) => SatisfiedCaaSMinioTenantBuilder;
  withServers: (servers: number) => SatisfiedCaaSMinioTenantBuilder;
  withVolumesPerServer: (
    volumesPerServer: number,
  ) => SatisfiedCaaSMinioTenantBuilder;
  withVolumeSize: (size: string) => SatisfiedCaaSMinioTenantBuilder;
  withStorageClass: (storageClass: string) => SatisfiedCaaSMinioTenantBuilder;
  withRequestAutoCert: (
    requestAutoCert: boolean,
  ) => SatisfiedCaaSMinioTenantBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSMinioTenantBuilder = {
  withId: (id: string) => CaaSMinioTenantBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSMinioTenantBuilder;
  withDisplayName: (displayName: string) => CaaSMinioTenantBuilder;
  withDescription: (description: string) => CaaSMinioTenantBuilder;
  withNamespace: (ns: string) => CaaSMinioTenantBuilder;
  withTenantName: (name: string) => CaaSMinioTenantBuilder;
  withBucketName: (bucket: string) => CaaSMinioTenantBuilder;
  withMinioVersion: (version: string) => CaaSMinioTenantBuilder;
  withServers: (servers: number) => CaaSMinioTenantBuilder;
  withVolumesPerServer: (volumesPerServer: number) => CaaSMinioTenantBuilder;
  withVolumeSize: (size: string) => CaaSMinioTenantBuilder;
  withStorageClass: (storageClass: string) => CaaSMinioTenantBuilder;
  withRequestAutoCert: (requestAutoCert: boolean) => CaaSMinioTenantBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSMinioTenantConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  tenantName?: string;
  bucketName?: string;
  minioVersion?: string;
  servers?: number;
  volumesPerServer?: number;
  volumeSize?: string;
  storageClass?: string;
  requestAutoCert?: boolean;
};

export namespace CaaSMinioTenant {
  export const getBuilder = (): CaaSMinioTenantBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildMinioTenantType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSMinioTenantBuilder = {
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
      withNamespace: ns => {
        pushParam(params, NAMESPACE_PARAM, ns);
        return builder;
      },
      withTenantName: name => {
        pushParam(params, TENANT_NAME_PARAM, name);
        return builder;
      },
      withBucketName: bucket => {
        pushParam(params, BUCKET_NAME_PARAM, bucket);
        return builder;
      },
      withMinioVersion: version => {
        pushParam(params, MINIO_VERSION_PARAM, version);
        return builder;
      },
      withServers: servers => {
        pushParam(params, SERVERS_PARAM, servers);
        return builder;
      },
      withVolumesPerServer: volumesPerServer => {
        pushParam(params, VOLUMES_PER_SERVER_PARAM, volumesPerServer);
        return builder;
      },
      withVolumeSize: size => {
        pushParam(params, VOLUME_SIZE_PARAM, size);
        return builder;
      },
      withStorageClass: storageClass => {
        pushParam(params, STORAGE_CLASS_PARAM, storageClass);
        return builder;
      },
      withRequestAutoCert: requestAutoCert => {
        pushParam(params, REQUEST_AUTO_CERT_PARAM, requestAutoCert);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSMinioTenantBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildMinioTenantType())
      .withParameters(params)
      .withProvider('CaaS')
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

    const satisfiedBuilder: SatisfiedCaaSMinioTenantBuilder = {
      withNamespace: ns => {
        pushParam(params, NAMESPACE_PARAM, ns);
        return satisfiedBuilder;
      },
      withTenantName: name => {
        pushParam(params, TENANT_NAME_PARAM, name);
        return satisfiedBuilder;
      },
      withBucketName: bucket => {
        pushParam(params, BUCKET_NAME_PARAM, bucket);
        return satisfiedBuilder;
      },
      withMinioVersion: version => {
        pushParam(params, MINIO_VERSION_PARAM, version);
        return satisfiedBuilder;
      },
      withServers: servers => {
        pushParam(params, SERVERS_PARAM, servers);
        return satisfiedBuilder;
      },
      withVolumesPerServer: volumesPerServer => {
        pushParam(params, VOLUMES_PER_SERVER_PARAM, volumesPerServer);
        return satisfiedBuilder;
      },
      withVolumeSize: size => {
        pushParam(params, VOLUME_SIZE_PARAM, size);
        return satisfiedBuilder;
      },
      withStorageClass: storageClass => {
        pushParam(params, STORAGE_CLASS_PARAM, storageClass);
        return satisfiedBuilder;
      },
      withRequestAutoCert: requestAutoCert => {
        pushParam(params, REQUEST_AUTO_CERT_PARAM, requestAutoCert);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: CaaSMinioTenantConfig,
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
    if (config.namespace) {
      b.withNamespace(config.namespace);
    }
    if (config.tenantName) {
      b.withTenantName(config.tenantName);
    }
    if (config.bucketName) {
      b.withBucketName(config.bucketName);
    }
    if (config.minioVersion) {
      b.withMinioVersion(config.minioVersion);
    }
    if (config.servers !== undefined) {
      b.withServers(config.servers);
    }
    if (config.volumesPerServer !== undefined) {
      b.withVolumesPerServer(config.volumesPerServer);
    }
    if (config.volumeSize) {
      b.withVolumeSize(config.volumeSize);
    }
    if (config.storageClass) {
      b.withStorageClass(config.storageClass);
    }
    if (config.requestAutoCert !== undefined) {
      b.withRequestAutoCert(config.requestAutoCert);
    }

    return b.build();
  };
}
