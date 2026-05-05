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
import {CaaSApiGatewayComponent} from '../../api_management/caas/api_gateway';
import {CaaSBrokerComponent} from '../../messaging/caas/broker';
import {SearchComponent} from '../../storage/caas/search';
import {MonitoringComponent} from '../../observability/caas/monitoring';
import {TracingComponent} from '../../observability/caas/tracing';
import {LoggingComponent} from '../../observability/caas/logging';
import {ServiceMeshComponent} from '../../security/caas/service_mesh';

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

function appendDep(
  bp: BlueprintComponent,
  dep: BlueprintComponentDependency,
): BlueprintComponent {
  return {...bp, dependencies: [...bp.dependencies, dep]};
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ContainerPlatformComponent = {
  readonly platform: BlueprintComponent;
  /**
   * Workload nodes with the platform dependency auto-wired into each component.
   * Pass these to Subnet.withWorkloads() so the subnet dep is stacked on top.
   */
  readonly workloads: ReadonlyArray<WorkloadComponent>;
  /** API Gateway with the platform dependency auto-wired (at most one per cluster). */
  readonly apiGateway: CaaSApiGatewayComponent | undefined;
  /** Messaging brokers with the platform dep auto-wired; entities transitively depend via the broker. */
  readonly brokers: ReadonlyArray<CaaSBrokerComponent>;
  /** Search clusters with the platform dep auto-wired; entities transitively depend via the search. */
  readonly searches: ReadonlyArray<SearchComponent>;
  /** Monitoring stack with the platform dependency auto-wired (at most one per cluster). */
  readonly monitoring: MonitoringComponent | undefined;
  /** Tracing backend with the platform dependency auto-wired (at most one per cluster). */
  readonly tracing: TracingComponent | undefined;
  /** Logging pipeline with the platform dependency auto-wired (at most one per cluster). */
  readonly logging: LoggingComponent | undefined;
  /** Service mesh with the platform dependency auto-wired (at most one per cluster). */
  readonly serviceMesh: ServiceMeshComponent | undefined;
  /**
   * Flat list of every blueprint component owned by this container platform —
   * the platform itself plus all wired CaaS services and their child entities.
   * Spread these into Fractal.withComponents() for direct inclusion.
   */
  readonly components: ReadonlyArray<BlueprintComponent>;
  withWorkloads: (workloads: WorkloadComponent[]) => ContainerPlatformComponent;
  withApiGateway: (
    apiGateway: CaaSApiGatewayComponent,
  ) => ContainerPlatformComponent;
  withBrokers: (brokers: CaaSBrokerComponent[]) => ContainerPlatformComponent;
  withSearches: (searches: SearchComponent[]) => ContainerPlatformComponent;
  withMonitoring: (
    monitoring: MonitoringComponent,
  ) => ContainerPlatformComponent;
  withTracing: (tracing: TracingComponent) => ContainerPlatformComponent;
  withLogging: (logging: LoggingComponent) => ContainerPlatformComponent;
  withServiceMesh: (
    serviceMesh: ServiceMeshComponent,
  ) => ContainerPlatformComponent;
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

type CaaSCollections = {
  workloads: ReadonlyArray<WorkloadComponent>;
  apiGateway: CaaSApiGatewayComponent | undefined;
  brokers: ReadonlyArray<CaaSBrokerComponent>;
  searches: ReadonlyArray<SearchComponent>;
  monitoring: MonitoringComponent | undefined;
  tracing: TracingComponent | undefined;
  logging: LoggingComponent | undefined;
  serviceMesh: ServiceMeshComponent | undefined;
};

const emptyCollections: CaaSCollections = {
  workloads: [],
  apiGateway: undefined,
  brokers: [],
  searches: [],
  monitoring: undefined,
  tracing: undefined,
  logging: undefined,
  serviceMesh: undefined,
};

function makeContainerPlatformComponent(
  platform: BlueprintComponent,
  caas: CaaSCollections,
): ContainerPlatformComponent {
  const platformDep: BlueprintComponentDependency = {id: platform.id};

  const wiredWorkloads = caas.workloads.map(w => ({
    ...w,
    component: appendDep(w.component, platformDep),
  }));

  const wiredBrokers = caas.brokers.map(b => {
    const broker = appendDep(b.broker, platformDep);
    return {...b, broker};
  });

  const wiredSearches = caas.searches.map(s => {
    const search = appendDep(s.search, platformDep);
    return {...s, search};
  });

  const wireSingleton = <T extends {component: BlueprintComponent}>(
    node: T | undefined,
  ): T | undefined => {
    if (!node) {
      return undefined;
    }
    const component = appendDep(node.component, platformDep);
    return {...node, component, components: [component]};
  };

  const wiredApiGateway = wireSingleton(caas.apiGateway);
  const wiredMonitoring = wireSingleton(caas.monitoring);
  const wiredTracing = wireSingleton(caas.tracing);
  const wiredLogging = wireSingleton(caas.logging);
  const wiredServiceMesh = wireSingleton(caas.serviceMesh);

  const components: BlueprintComponent[] = [
    platform,
    ...wiredWorkloads.map(w => w.component),
    ...(wiredApiGateway ? [wiredApiGateway.component] : []),
    ...wiredBrokers.flatMap(b => [
      b.broker,
      ...b.entities.map(e => e.component),
    ]),
    ...wiredSearches.flatMap(s => [
      s.search,
      ...s.entities.map(e => e.component),
    ]),
    ...(wiredMonitoring ? [wiredMonitoring.component] : []),
    ...(wiredTracing ? [wiredTracing.component] : []),
    ...(wiredLogging ? [wiredLogging.component] : []),
    ...(wiredServiceMesh ? [wiredServiceMesh.component] : []),
  ];

  return {
    platform,
    workloads: wiredWorkloads,
    apiGateway: wiredApiGateway,
    brokers: wiredBrokers,
    searches: wiredSearches,
    monitoring: wiredMonitoring,
    tracing: wiredTracing,
    logging: wiredLogging,
    serviceMesh: wiredServiceMesh,
    components,
    withWorkloads: workloads =>
      makeContainerPlatformComponent(platform, {...caas, workloads}),
    withApiGateway: apiGateway =>
      makeContainerPlatformComponent(platform, {...caas, apiGateway}),
    withBrokers: brokers =>
      makeContainerPlatformComponent(platform, {...caas, brokers}),
    withSearches: searches =>
      makeContainerPlatformComponent(platform, {...caas, searches}),
    withMonitoring: monitoring =>
      makeContainerPlatformComponent(platform, {...caas, monitoring}),
    withTracing: tracing =>
      makeContainerPlatformComponent(platform, {...caas, tracing}),
    withLogging: logging =>
      makeContainerPlatformComponent(platform, {...caas, logging}),
    withServiceMesh: serviceMesh =>
      makeContainerPlatformComponent(platform, {...caas, serviceMesh}),
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

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.nodePools) {
      b.withNodePools(config.nodePools);
    }

    return makeContainerPlatformComponent(b.build(), emptyCollections);
  };
}
