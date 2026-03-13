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

// BFF offer id: NetworkAndCompute.PaaS.Kubernetes (shared across providers)
const EKS_CLUSTER_TYPE_NAME = 'Kubernetes';

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

function buildAwsEksClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(EKS_CLUSTER_TYPE_NAME).build(),
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

export type SatisfiedAwsEksClusterBuilder = {
  withKubernetesVersion: (version: string) => SatisfiedAwsEksClusterBuilder;
  withNetworkPolicyProvider: (
    provider: string,
  ) => SatisfiedAwsEksClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => SatisfiedAwsEksClusterBuilder;
  withVpcCidrBlock: (cidr: string) => SatisfiedAwsEksClusterBuilder;
  withPrivateSubnetCidrs: (cidrs: string[]) => SatisfiedAwsEksClusterBuilder;
  withDesiredAvailabilityZoneCount: (
    count: number,
  ) => SatisfiedAwsEksClusterBuilder;
  withNodePools: (
    nodePools: Record<string, unknown>[],
  ) => SatisfiedAwsEksClusterBuilder;
  withAddons: (
    addons: Record<string, unknown>[],
  ) => SatisfiedAwsEksClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => SatisfiedAwsEksClusterBuilder;
  withRoles: (
    roles: Record<string, unknown>[],
  ) => SatisfiedAwsEksClusterBuilder;
  withWorkloadIdentityEnabled: (
    enabled: boolean,
  ) => SatisfiedAwsEksClusterBuilder;
  withPrivateClusterDisabled: (
    disabled: boolean,
  ) => SatisfiedAwsEksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AwsEksClusterBuilder = {
  withId: (id: string) => AwsEksClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsEksClusterBuilder;
  withDisplayName: (displayName: string) => AwsEksClusterBuilder;
  withDescription: (description: string) => AwsEksClusterBuilder;
  withKubernetesVersion: (version: string) => AwsEksClusterBuilder;
  withNetworkPolicyProvider: (provider: string) => AwsEksClusterBuilder;
  withMasterIpv4CidrBlock: (cidr: string) => AwsEksClusterBuilder;
  withVpcCidrBlock: (cidr: string) => AwsEksClusterBuilder;
  withPrivateSubnetCidrs: (cidrs: string[]) => AwsEksClusterBuilder;
  withDesiredAvailabilityZoneCount: (count: number) => AwsEksClusterBuilder;
  withNodePools: (nodePools: Record<string, unknown>[]) => AwsEksClusterBuilder;
  withAddons: (addons: Record<string, unknown>[]) => AwsEksClusterBuilder;
  withPriorityClasses: (
    classes: Record<string, unknown>[],
  ) => AwsEksClusterBuilder;
  withRoles: (roles: Record<string, unknown>[]) => AwsEksClusterBuilder;
  withWorkloadIdentityEnabled: (enabled: boolean) => AwsEksClusterBuilder;
  withPrivateClusterDisabled: (disabled: boolean) => AwsEksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AwsEksClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  kubernetesVersion?: string;
  networkPolicyProvider?: string;
  masterIpv4CidrBlock?: string;
  vpcCidrBlock?: string;
  privateSubnetCidrs?: string[];
  desiredAvailabilityZoneCount?: number;
  nodePools?: Record<string, unknown>[];
  addons?: Record<string, unknown>[];
  priorityClasses?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  workloadIdentityEnabled?: boolean;
  privateClusterDisabled?: boolean;
};

export namespace AwsEksCluster {
  export const getBuilder = (): AwsEksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEksClusterType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsEksClusterBuilder = {
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
      withVpcCidrBlock: cidr => {
        pushParam(params, 'vpcCidrBlock', cidr);
        return builder;
      },
      withPrivateSubnetCidrs: cidrs => {
        pushParam(params, 'privateSubnetCidrs', cidrs);
        return builder;
      },
      withDesiredAvailabilityZoneCount: count => {
        pushParam(params, 'desiredAvailabilityZoneCount', count);
        return builder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return builder;
      },
      withAddons: addons => {
        pushParam(params, 'addons', addons);
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
   * Satisfies a blueprint ContainerPlatform component as an AWS EKS Cluster.
   * Carries id, version, displayName, and description from the blueprint.
   * All cluster-specific parameters (Kubernetes version, node pools, etc.)
   * are AWS-specific and must be added via the builder methods.
   */
  export const satisfy = (
    platform: BlueprintComponent,
  ): SatisfiedAwsEksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEksClusterType())
      .withParameters(params)
      .withProvider('AWS')
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

    const satisfiedBuilder: SatisfiedAwsEksClusterBuilder = {
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
      withVpcCidrBlock: cidr => {
        pushParam(params, 'vpcCidrBlock', cidr);
        return satisfiedBuilder;
      },
      withPrivateSubnetCidrs: cidrs => {
        pushParam(params, 'privateSubnetCidrs', cidrs);
        return satisfiedBuilder;
      },
      withDesiredAvailabilityZoneCount: count => {
        pushParam(params, 'desiredAvailabilityZoneCount', count);
        return satisfiedBuilder;
      },
      withNodePools: nodePools => {
        pushParam(params, 'nodePools', nodePools);
        return satisfiedBuilder;
      },
      withAddons: addons => {
        pushParam(params, 'addons', addons);
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

  export const create = (config: AwsEksClusterConfig): LiveSystemComponent => {
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
    if (config.vpcCidrBlock) b.withVpcCidrBlock(config.vpcCidrBlock);
    if (config.privateSubnetCidrs)
      b.withPrivateSubnetCidrs(config.privateSubnetCidrs);
    if (config.desiredAvailabilityZoneCount !== undefined)
      b.withDesiredAvailabilityZoneCount(config.desiredAvailabilityZoneCount);
    if (config.nodePools) b.withNodePools(config.nodePools);
    if (config.addons) b.withAddons(config.addons);
    if (config.priorityClasses) b.withPriorityClasses(config.priorityClasses);
    if (config.roles) b.withRoles(config.roles);
    if (config.workloadIdentityEnabled !== undefined)
      b.withWorkloadIdentityEnabled(config.workloadIdentityEnabled);
    if (config.privateClusterDisabled !== undefined)
      b.withPrivateClusterDisabled(config.privateClusterDisabled);

    return b.build();
  };
}
