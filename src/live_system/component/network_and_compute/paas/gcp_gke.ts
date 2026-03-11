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

// Agent constant: GKE_COMPONENT_NAME = "GKE"
const GKE_CLUSTER_TYPE_NAME = 'GKE';

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

function buildGcpGkeClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GKE_CLUSTER_TYPE_NAME).build(),
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

export type SatisfiedGcpGkeClusterBuilder = {
  withKubernetesVersion: (version: string) => SatisfiedGcpGkeClusterBuilder;
  withNetworkPolicyProvider: (
    provider: string,
  ) => SatisfiedGcpGkeClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => SatisfiedGcpGkeClusterBuilder;
  withNetworkName: (name: string) => SatisfiedGcpGkeClusterBuilder;
  withSubnetworkName: (name: string) => SatisfiedGcpGkeClusterBuilder;
  withSubnetworkIpRange: (range: string) => SatisfiedGcpGkeClusterBuilder;
  withServiceIpRange: (range: string) => SatisfiedGcpGkeClusterBuilder;
  withPodIpRange: (range: string) => SatisfiedGcpGkeClusterBuilder;
  withPodsRangeName: (name: string) => SatisfiedGcpGkeClusterBuilder;
  withServicesRangeName: (name: string) => SatisfiedGcpGkeClusterBuilder;
  withNodePools: (
    nodePools: Record<string, unknown>[],
  ) => SatisfiedGcpGkeClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => SatisfiedGcpGkeClusterBuilder;
  withRoles: (
    roles: Record<string, unknown>[],
  ) => SatisfiedGcpGkeClusterBuilder;
  withWorkloadIdentityEnabled: (
    enabled: boolean,
  ) => SatisfiedGcpGkeClusterBuilder;
  withPrivateClusterDisabled: (
    disabled: boolean,
  ) => SatisfiedGcpGkeClusterBuilder;
  build: () => LiveSystemComponent;
};

export type GcpGkeClusterBuilder = {
  withId: (id: string) => GcpGkeClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpGkeClusterBuilder;
  withDisplayName: (displayName: string) => GcpGkeClusterBuilder;
  withDescription: (description: string) => GcpGkeClusterBuilder;
  withKubernetesVersion: (version: string) => GcpGkeClusterBuilder;
  withNetworkPolicyProvider: (provider: string) => GcpGkeClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => GcpGkeClusterBuilder;
  withNetworkName: (name: string) => GcpGkeClusterBuilder;
  withSubnetworkName: (name: string) => GcpGkeClusterBuilder;
  withSubnetworkIpRange: (range: string) => GcpGkeClusterBuilder;
  withServiceIpRange: (range: string) => GcpGkeClusterBuilder;
  withPodIpRange: (range: string) => GcpGkeClusterBuilder;
  withPodsRangeName: (name: string) => GcpGkeClusterBuilder;
  withServicesRangeName: (name: string) => GcpGkeClusterBuilder;
  withNodePools: (nodePools: Record<string, unknown>[]) => GcpGkeClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => GcpGkeClusterBuilder;
  withRoles: (roles: Record<string, unknown>[]) => GcpGkeClusterBuilder;
  withWorkloadIdentityEnabled: (enabled: boolean) => GcpGkeClusterBuilder;
  withPrivateClusterDisabled: (disabled: boolean) => GcpGkeClusterBuilder;
  build: () => LiveSystemComponent;
};

export type GcpGkeClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  kubernetesVersion?: string;
  networkPolicyProvider?: string;
  masterIpv4CidrBlock?: string;
  networkName?: string;
  subnetworkName?: string;
  subnetworkIpRange?: string;
  serviceIpRange?: string;
  podIpRange?: string;
  podsRangeName?: string;
  servicesRangeName?: string;
  nodePools?: Record<string, unknown>[];
  priorityClasses?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  workloadIdentityEnabled?: boolean;
  privateClusterDisabled?: boolean;
};

export namespace GcpGkeCluster {
  export const getBuilder = (): GcpGkeClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpGkeClusterType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpGkeClusterBuilder = {
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
      withKubernetesVersion: v => {
        pushParam(params, 'kubernetesVersion', v);
        return builder;
      },
      withNetworkPolicyProvider: p => {
        pushParam(params, 'networkPolicyProvider', p);
        return builder;
      },
      withMasterIpv4CidrBlock: cidr => {
        pushParam(params, 'masterIpv4CidrBlock', cidr);
        return builder;
      },
      withNetworkName: name => {
        pushParam(params, 'networkName', name);
        return builder;
      },
      withSubnetworkName: name => {
        pushParam(params, 'subnetworkName', name);
        return builder;
      },
      withSubnetworkIpRange: range => {
        pushParam(params, 'subnetworkIpRange', range);
        return builder;
      },
      withServiceIpRange: range => {
        pushParam(params, 'serviceIpRange', range);
        return builder;
      },
      withPodIpRange: range => {
        pushParam(params, 'podIpRange', range);
        return builder;
      },
      withPodsRangeName: name => {
        pushParam(params, 'podsRangeName', name);
        return builder;
      },
      withServicesRangeName: name => {
        pushParam(params, 'servicesRangeName', name);
        return builder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return builder;
      },
      withPriorityClasses: classes => {
        pushParam(params, 'priorityClasses', classes);
        return builder;
      },
      withRoles: roles => {
        pushParam(params, 'roles', roles);
        return builder;
      },
      withWorkloadIdentityEnabled: enabled => {
        pushParam(params, 'workloadIdentityEnabled', enabled);
        return builder;
      },
      withPrivateClusterDisabled: disabled => {
        pushParam(params, 'privateClusterDisabled', disabled);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint ContainerPlatform component as a GCP GKE Cluster.
   * Carries id, version, displayName, and description from the blueprint.
   * All cluster-specific parameters are GCP-specific and must be added via
   * the builder methods.
   */
  export const satisfy = (
    platform: BlueprintComponent,
  ): SatisfiedGcpGkeClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpGkeClusterType())
      .withParameters(params)
      .withProvider('GCP')
      .withId(buildId(platform.id.toString()))
      .withVersion(
        buildVersion(
          platform.version.major,
          platform.version.minor,
          platform.version.patch,
        ),
      )
      .withDisplayName(platform.displayName);

    if (platform.description) inner.withDescription(platform.description);

    const satisfiedBuilder: SatisfiedGcpGkeClusterBuilder = {
      withKubernetesVersion: v => {
        pushParam(params, 'kubernetesVersion', v);
        return satisfiedBuilder;
      },
      withNetworkPolicyProvider: p => {
        pushParam(params, 'networkPolicyProvider', p);
        return satisfiedBuilder;
      },
      withMasterIpv4CidrBlock: cidr => {
        pushParam(params, 'masterIpv4CidrBlock', cidr);
        return satisfiedBuilder;
      },
      withNetworkName: name => {
        pushParam(params, 'networkName', name);
        return satisfiedBuilder;
      },
      withSubnetworkName: name => {
        pushParam(params, 'subnetworkName', name);
        return satisfiedBuilder;
      },
      withSubnetworkIpRange: range => {
        pushParam(params, 'subnetworkIpRange', range);
        return satisfiedBuilder;
      },
      withServiceIpRange: range => {
        pushParam(params, 'serviceIpRange', range);
        return satisfiedBuilder;
      },
      withPodIpRange: range => {
        pushParam(params, 'podIpRange', range);
        return satisfiedBuilder;
      },
      withPodsRangeName: name => {
        pushParam(params, 'podsRangeName', name);
        return satisfiedBuilder;
      },
      withServicesRangeName: name => {
        pushParam(params, 'servicesRangeName', name);
        return satisfiedBuilder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return satisfiedBuilder;
      },
      withPriorityClasses: classes => {
        pushParam(params, 'priorityClasses', classes);
        return satisfiedBuilder;
      },
      withRoles: roles => {
        pushParam(params, 'roles', roles);
        return satisfiedBuilder;
      },
      withWorkloadIdentityEnabled: enabled => {
        pushParam(params, 'workloadIdentityEnabled', enabled);
        return satisfiedBuilder;
      },
      withPrivateClusterDisabled: disabled => {
        pushParam(params, 'privateClusterDisabled', disabled);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpGkeClusterConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.kubernetesVersion)
      b.withKubernetesVersion(config.kubernetesVersion);
    if (config.networkPolicyProvider)
      b.withNetworkPolicyProvider(config.networkPolicyProvider);
    if (config.masterIpv4CidrBlock)
      b.withMasterIpv4CidrBlock(config.masterIpv4CidrBlock);
    if (config.networkName) b.withNetworkName(config.networkName);
    if (config.subnetworkName) b.withSubnetworkName(config.subnetworkName);
    if (config.subnetworkIpRange)
      b.withSubnetworkIpRange(config.subnetworkIpRange);
    if (config.serviceIpRange) b.withServiceIpRange(config.serviceIpRange);
    if (config.podIpRange) b.withPodIpRange(config.podIpRange);
    if (config.podsRangeName) b.withPodsRangeName(config.podsRangeName);
    if (config.servicesRangeName)
      b.withServicesRangeName(config.servicesRangeName);
    if (config.nodePools) b.withNodePools(config.nodePools);
    if (config.priorityClasses) b.withPriorityClasses(config.priorityClasses);
    if (config.roles) b.withRoles(config.roles);
    if (config.workloadIdentityEnabled !== undefined)
      b.withWorkloadIdentityEnabled(config.workloadIdentityEnabled);
    if (config.privateClusterDisabled !== undefined)
      b.withPrivateClusterDisabled(config.privateClusterDisabled);

    return b.build();
  };
}
