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

// Agent constant: AKS_COMPONENT_NAME = "AKS"
const AKS_CLUSTER_TYPE_NAME = 'AKS';

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

function buildAzureAksClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AKS_CLUSTER_TYPE_NAME).build(),
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

export type SatisfiedAzureAksClusterBuilder = {
  withKubernetesVersion: (version: string) => SatisfiedAzureAksClusterBuilder;
  withNetworkPolicyProvider: (
    provider: string,
  ) => SatisfiedAzureAksClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => SatisfiedAzureAksClusterBuilder;
  withVnetSubnetAddressIpRange: (
    range: string,
  ) => SatisfiedAzureAksClusterBuilder;
  withManagedClusterSkuTier: (tier: string) => SatisfiedAzureAksClusterBuilder;
  withWindowsAdminUsername: (
    username: string,
  ) => SatisfiedAzureAksClusterBuilder;
  withExternalWorkspaceResourceId: (
    id: string,
  ) => SatisfiedAzureAksClusterBuilder;
  withNodePools: (
    nodePools: Record<string, unknown>[],
  ) => SatisfiedAzureAksClusterBuilder;
  withAzureActiveDirectoryProfile: (
    profile: Record<string, unknown>,
  ) => SatisfiedAzureAksClusterBuilder;
  withOutboundIps: (
    ips: Record<string, unknown>[],
  ) => SatisfiedAzureAksClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => SatisfiedAzureAksClusterBuilder;
  withRoles: (
    roles: Record<string, unknown>[],
  ) => SatisfiedAzureAksClusterBuilder;
  withWorkloadIdentityEnabled: (
    enabled: boolean,
  ) => SatisfiedAzureAksClusterBuilder;
  withPrivateClusterDisabled: (
    disabled: boolean,
  ) => SatisfiedAzureAksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AzureAksClusterBuilder = {
  withId: (id: string) => AzureAksClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureAksClusterBuilder;
  withDisplayName: (displayName: string) => AzureAksClusterBuilder;
  withDescription: (description: string) => AzureAksClusterBuilder;
  withKubernetesVersion: (version: string) => AzureAksClusterBuilder;
  withNetworkPolicyProvider: (provider: string) => AzureAksClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => AzureAksClusterBuilder;
  withVnetSubnetAddressIpRange: (range: string) => AzureAksClusterBuilder;
  withManagedClusterSkuTier: (tier: string) => AzureAksClusterBuilder;
  withWindowsAdminUsername: (username: string) => AzureAksClusterBuilder;
  withExternalWorkspaceResourceId: (id: string) => AzureAksClusterBuilder;
  withNodePools: (
    nodePools: Record<string, unknown>[],
  ) => AzureAksClusterBuilder;
  withAzureActiveDirectoryProfile: (
    profile: Record<string, unknown>,
  ) => AzureAksClusterBuilder;
  withOutboundIps: (ips: Record<string, unknown>[]) => AzureAksClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => AzureAksClusterBuilder;
  withRoles: (roles: Record<string, unknown>[]) => AzureAksClusterBuilder;
  withWorkloadIdentityEnabled: (enabled: boolean) => AzureAksClusterBuilder;
  withPrivateClusterDisabled: (disabled: boolean) => AzureAksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AzureAksClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  kubernetesVersion?: string;
  networkPolicyProvider?: string;
  masterIpv4CidrBlock?: string;
  vnetSubnetAddressIpRange?: string;
  managedClusterSkuTier?: string;
  windowsAdminUsername?: string;
  externalWorkspaceResourceId?: string;
  nodePools?: Record<string, unknown>[];
  azureActiveDirectoryProfile?: Record<string, unknown>;
  outboundIps?: Record<string, unknown>[];
  priorityClasses?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  workloadIdentityEnabled?: boolean;
  privateClusterDisabled?: boolean;
};

export namespace AzureAksCluster {
  export const getBuilder = (): AzureAksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureAksClusterType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureAksClusterBuilder = {
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
      withVnetSubnetAddressIpRange: range => {
        pushParam(params, 'vnetSubnetAddressIpRange', range);
        return builder;
      },
      withManagedClusterSkuTier: tier => {
        pushParam(params, 'managedClusterSkuTier', tier);
        return builder;
      },
      withWindowsAdminUsername: username => {
        pushParam(params, 'windowsAdminUsername', username);
        return builder;
      },
      withExternalWorkspaceResourceId: id => {
        pushParam(params, 'externalWorkspaceResourceId', id);
        return builder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return builder;
      },
      withAzureActiveDirectoryProfile: profile => {
        pushParam(params, 'azureActiveDirectoryProfile', profile);
        return builder;
      },
      withOutboundIps: ips => {
        pushParam(params, 'outboundIps', ips);
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
   * Satisfies a blueprint ContainerPlatform component as an Azure AKS Cluster.
   * Carries id, version, displayName, and description from the blueprint.
   * All cluster-specific parameters are Azure-specific and must be added via
   * the builder methods.
   */
  export const satisfy = (
    platform: BlueprintComponent,
  ): SatisfiedAzureAksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureAksClusterType())
      .withParameters(params)
      .withProvider('Azure')
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

    const satisfiedBuilder: SatisfiedAzureAksClusterBuilder = {
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
      withVnetSubnetAddressIpRange: range => {
        pushParam(params, 'vnetSubnetAddressIpRange', range);
        return satisfiedBuilder;
      },
      withManagedClusterSkuTier: tier => {
        pushParam(params, 'managedClusterSkuTier', tier);
        return satisfiedBuilder;
      },
      withWindowsAdminUsername: username => {
        pushParam(params, 'windowsAdminUsername', username);
        return satisfiedBuilder;
      },
      withExternalWorkspaceResourceId: id => {
        pushParam(params, 'externalWorkspaceResourceId', id);
        return satisfiedBuilder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return satisfiedBuilder;
      },
      withAzureActiveDirectoryProfile: profile => {
        pushParam(params, 'azureActiveDirectoryProfile', profile);
        return satisfiedBuilder;
      },
      withOutboundIps: ips => {
        pushParam(params, 'outboundIps', ips);
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

  export const create = (
    config: AzureAksClusterConfig,
  ): LiveSystemComponent => {
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
    if (config.vnetSubnetAddressIpRange)
      b.withVnetSubnetAddressIpRange(config.vnetSubnetAddressIpRange);
    if (config.managedClusterSkuTier)
      b.withManagedClusterSkuTier(config.managedClusterSkuTier);
    if (config.windowsAdminUsername)
      b.withWindowsAdminUsername(config.windowsAdminUsername);
    if (config.externalWorkspaceResourceId)
      b.withExternalWorkspaceResourceId(config.externalWorkspaceResourceId);
    if (config.nodePools) b.withNodePools(config.nodePools);
    if (config.azureActiveDirectoryProfile)
      b.withAzureActiveDirectoryProfile(config.azureActiveDirectoryProfile);
    if (config.outboundIps) b.withOutboundIps(config.outboundIps);
    if (config.priorityClasses) b.withPriorityClasses(config.priorityClasses);
    if (config.roles) b.withRoles(config.roles);
    if (config.workloadIdentityEnabled !== undefined)
      b.withWorkloadIdentityEnabled(config.workloadIdentityEnabled);
    if (config.privateClusterDisabled !== undefined)
      b.withPrivateClusterDisabled(config.privateClusterDisabled);

    return b.build();
  };
}
