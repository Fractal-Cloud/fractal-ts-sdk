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
import {ComponentLink} from '../../../../component/link';
import {VirtualMachineBuilder, VirtualMachineComponent} from './vm';
import {WorkloadComponent} from '../../custom_workloads/caas/workload';

export const SUBNET_TYPE_NAME = 'Subnet';
export const CIDR_BLOCK_PARAM = 'cidrBlock';

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

function buildSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(SUBNET_TYPE_NAME).build())
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

export type SubnetComponent = {
  readonly subnet: BlueprintComponent;
  readonly virtualMachines: ReadonlyArray<BlueprintComponent>;
  readonly workloads: ReadonlyArray<BlueprintComponent>;
  readonly components: ReadonlyArray<BlueprintComponent>;
  withVirtualMachines: (vms: VirtualMachineComponent[]) => SubnetComponent;
  withWorkloads: (
    workloads: ReadonlyArray<WorkloadComponent>,
  ) => SubnetComponent;
};

export type SubnetResult = {
  readonly subnet: BlueprintComponent;
  readonly virtualMachines: ReadonlyArray<BlueprintComponent>;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type SubnetBuilder = {
  withId: (id: string) => SubnetBuilder;
  withVersion: (major: number, minor: number, patch: number) => SubnetBuilder;
  withDisplayName: (displayName: string) => SubnetBuilder;
  withDescription: (description: string) => SubnetBuilder;
  withCidrBlock: (cidrBlock: string) => SubnetBuilder;
  withVirtualMachine: (builder: VirtualMachineBuilder) => SubnetBuilder;
  withLinks: (links: ComponentLink[]) => SubnetBuilder;
  build: () => SubnetResult;
};

export type SubnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock?: string;
};

function makeSubnetComponent(
  subnet: BlueprintComponent,
  vms: VirtualMachineComponent[],
  workloadNodes: ReadonlyArray<WorkloadComponent>,
): SubnetComponent {
  const subnetDep: BlueprintComponentDependency = {id: subnet.id};
  const wiredVMs = vms.map(n => ({
    ...n.component,
    dependencies: [...n.component.dependencies, subnetDep],
  }));
  const wiredWorkloads = workloadNodes.map(w => ({
    ...w.component,
    dependencies: [...w.component.dependencies, subnetDep],
  }));
  return {
    subnet,
    virtualMachines: wiredVMs,
    workloads: wiredWorkloads,
    components: [subnet, ...wiredVMs, ...wiredWorkloads],
    withVirtualMachines: newVMs =>
      makeSubnetComponent(subnet, newVMs, workloadNodes),
    withWorkloads: newWorkloads =>
      makeSubnetComponent(subnet, vms, newWorkloads),
  };
}

export namespace Subnet {
  export const getBuilder = (): SubnetBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildSubnetType())
      .withParameters(params);

    const vmBuilders: VirtualMachineBuilder[] = [];

    const builder: SubnetBuilder = {
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
      withCidrBlock: value => {
        pushParam(params, CIDR_BLOCK_PARAM, value);
        return builder;
      },
      withVirtualMachine: vmBuilder => {
        vmBuilders.push(vmBuilder);
        return builder;
      },
      withLinks: links => {
        inner.withLinks(links);
        return builder;
      },
      build: (): SubnetResult => {
        const subnet = inner.build();
        const subnetDep: BlueprintComponentDependency = {id: subnet.id};
        const virtualMachines = vmBuilders.map(b => ({
          ...b.build(),
          dependencies: [subnetDep],
        }));
        return {
          subnet,
          virtualMachines,
          components: [subnet, ...virtualMachines],
        };
      },
    };

    return builder;
  };

  export const create = (config: SubnetConfig): SubnetComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.cidrBlock) b.withCidrBlock(config.cidrBlock);
    if (config.description) b.withDescription(config.description);

    return makeSubnetComponent(b.build().subnet, [], []);
  };
}
