import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
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
import {BlueprintComponent} from '../../index';
import {BlueprintComponentDependency} from '../../dependency';
import {WorkloadComponent} from '../../custom_workloads/caas/workload';

export const CONTAINER_PLATFORM_TYPE_NAME = 'ContainerPlatform';
export const NODE_POOLS_PARAM = 'nodePools';

export type NodePoolConfig = {
  name: string;
  diskSizeGb?: number;
  minNodeCount?: number;
  maxNodeCount?: number;
  maxPodsPerNode?: number;
  autoscalingEnabled?: boolean;
  initialNodeCount?: number;
  maxSurge?: number;
};

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

function buildContainerPlatformType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CONTAINER_PLATFORM_TYPE_NAME)
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

// ── Public API ────────────────────────────────────────────────────────────────

export type ContainerPlatformComponent = {
  readonly platform: BlueprintComponent;
  /**
   * Workload nodes with the platform dependency auto-wired into each component.
   * Pass these to Subnet.withWorkloads() so the subnet dep is stacked on top.
   */
  readonly workloads: ReadonlyArray<WorkloadComponent>;
  withWorkloads: (workloads: WorkloadComponent[]) => ContainerPlatformComponent;
};

export type ContainerPlatformBuilder = {
  withId: (id: string) => ContainerPlatformBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ContainerPlatformBuilder;
  withDisplayName: (displayName: string) => ContainerPlatformBuilder;
  withDescription: (description: string) => ContainerPlatformBuilder;
  withNodePools: (nodePools: NodePoolConfig[]) => ContainerPlatformBuilder;
  build: () => BlueprintComponent;
};

export type ContainerPlatformConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  nodePools?: NodePoolConfig[];
};

function makeContainerPlatformComponent(
  platform: BlueprintComponent,
  workloadNodes: WorkloadComponent[],
): ContainerPlatformComponent {
  const platformDep: BlueprintComponentDependency = {id: platform.id};
  const wiredWorkloads = workloadNodes.map(w => ({
    ...w,
    component: {
      ...w.component,
      dependencies: [...w.component.dependencies, platformDep],
    },
  }));
  return {
    platform,
    workloads: wiredWorkloads,
    withWorkloads: newWorkloads =>
      makeContainerPlatformComponent(platform, newWorkloads),
  };
}

export namespace ContainerPlatform {
  export const getBuilder = (): ContainerPlatformBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildContainerPlatformType())
      .withParameters(params);

    const builder: ContainerPlatformBuilder = {
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
      withNodePools: nodePools => {
        pushParam(params, NODE_POOLS_PARAM, nodePools);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: ContainerPlatformConfig,
  ): ContainerPlatformComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.nodePools) b.withNodePools(config.nodePools);

    return makeContainerPlatformComponent(b.build(), []);
  };
}
