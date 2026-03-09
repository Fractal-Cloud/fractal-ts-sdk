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
import {getLinkBuilder} from '../../../../component/link';

export const WORKLOAD_TYPE_NAME = 'Workload';
export const CONTAINER_IMAGE_PARAM = 'containerImage';
export const CONTAINER_PORT_PARAM = 'containerPort';
export const CONTAINER_NAME_PARAM = 'containerName';
export const CPU_PARAM = 'cpu';
export const MEMORY_PARAM = 'memory';
export const DESIRED_COUNT_PARAM = 'desiredCount';

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

function buildWorkloadType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(WORKLOAD_TYPE_NAME).build(),
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

function buildLinkParams(
  fromPort: number,
  toPort?: number,
  protocol?: string,
): GenericParameters {
  const p = getParametersInstance();
  p.push('fromPort', fromPort as unknown as Record<string, object>);
  if (toPort !== undefined)
    p.push('toPort', toPort as unknown as Record<string, object>);
  if (protocol)
    p.push('protocol', protocol as unknown as Record<string, object>);
  return p;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Link from one Workload to another, declaring a traffic rule.
 * The agent derives managed SG egress/ingress rules from these.
 */
export type WorkloadPortLink = {
  target: WorkloadNode;
  fromPort: number;
  toPort?: number;
  protocol?: string;
};

export type WorkloadNode = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
  withLinks: (links: WorkloadPortLink[]) => WorkloadNode;
  withSecurityGroups: (sgs: BlueprintComponent[]) => WorkloadNode;
};

export type WorkloadBuilder = {
  withId: (id: string) => WorkloadBuilder;
  withVersion: (major: number, minor: number, patch: number) => WorkloadBuilder;
  withDisplayName: (displayName: string) => WorkloadBuilder;
  withDescription: (description: string) => WorkloadBuilder;
  withContainerImage: (image: string) => WorkloadBuilder;
  withContainerPort: (port: number) => WorkloadBuilder;
  withContainerName: (name: string) => WorkloadBuilder;
  withCpu: (cpu: string) => WorkloadBuilder;
  withMemory: (memory: string) => WorkloadBuilder;
  withDesiredCount: (count: number) => WorkloadBuilder;
  build: () => BlueprintComponent;
};

export type WorkloadConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  containerImage: string;
  containerPort?: number;
  containerName?: string;
  cpu?: string;
  memory?: string;
  desiredCount?: number;
};

function makeWorkloadNode(component: BlueprintComponent): WorkloadNode {
  return {
    component,
    components: [component],
    withLinks: (links: WorkloadPortLink[]) => {
      const portLinks = links.map(l =>
        getLinkBuilder()
          .withId(l.target.component.id)
          .withType(buildWorkloadType())
          .withParameters(buildLinkParams(l.fromPort, l.toPort, l.protocol))
          .build(),
      );
      return makeWorkloadNode({
        ...component,
        links: [...component.links, ...portLinks],
      });
    },
    withSecurityGroups: (sgs: BlueprintComponent[]) => {
      const sgLinks = sgs.map(sg =>
        getLinkBuilder()
          .withId(sg.id)
          .withType(sg.type)
          .withParameters(getParametersInstance())
          .build(),
      );
      return makeWorkloadNode({
        ...component,
        links: [...component.links, ...sgLinks],
      });
    },
  };
}

export namespace Workload {
  export const getBuilder = (): WorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildWorkloadType())
      .withParameters(params);

    const builder: WorkloadBuilder = {
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
      withContainerImage: image => {
        pushParam(params, CONTAINER_IMAGE_PARAM, image);
        return builder;
      },
      withContainerPort: port => {
        pushParam(params, CONTAINER_PORT_PARAM, port);
        return builder;
      },
      withContainerName: name => {
        pushParam(params, CONTAINER_NAME_PARAM, name);
        return builder;
      },
      withCpu: cpu => {
        pushParam(params, CPU_PARAM, cpu);
        return builder;
      },
      withMemory: memory => {
        pushParam(params, MEMORY_PARAM, memory);
        return builder;
      },
      withDesiredCount: count => {
        pushParam(params, DESIRED_COUNT_PARAM, count);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: WorkloadConfig): WorkloadNode => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withContainerImage(config.containerImage);

    if (config.description) b.withDescription(config.description);
    if (config.containerPort !== undefined)
      b.withContainerPort(config.containerPort);
    if (config.containerName) b.withContainerName(config.containerName);
    if (config.cpu) b.withCpu(config.cpu);
    if (config.memory) b.withMemory(config.memory);
    if (config.desiredCount !== undefined)
      b.withDesiredCount(config.desiredCount);

    return makeWorkloadNode(b.build());
  };
}
