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
import {SubnetBuilder, SubnetComponent} from './subnet';
import {SecurityGroupBuilder} from './security_group';

export const VIRTUAL_NETWORK_TYPE_NAME = 'VirtualNetwork';
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

function buildVirtualNetworkType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(VIRTUAL_NETWORK_TYPE_NAME)
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

export type VirtualNetworkComponent = {
  readonly vpc: BlueprintComponent;
  readonly subnets: ReadonlyArray<BlueprintComponent>;
  readonly securityGroups: ReadonlyArray<BlueprintComponent>;
  readonly virtualMachines: ReadonlyArray<BlueprintComponent>;
  readonly workloads: ReadonlyArray<BlueprintComponent>;
  readonly components: ReadonlyArray<BlueprintComponent>;
  withSubnets: (subnets: SubnetComponent[]) => VirtualNetworkComponent;
  withSecurityGroups: (sgs: BlueprintComponent[]) => VirtualNetworkComponent;
};

export type VirtualNetworkResult = {
  readonly vpc: BlueprintComponent;
  readonly subnets: ReadonlyArray<BlueprintComponent>;
  readonly securityGroups: ReadonlyArray<BlueprintComponent>;
  readonly virtualMachines: ReadonlyArray<BlueprintComponent>;
  readonly workloads: ReadonlyArray<BlueprintComponent>;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

function makeVirtualNetworkComponent(
  vpc: BlueprintComponent,
  subnetNodes: SubnetComponent[],
  sgs: BlueprintComponent[],
): VirtualNetworkComponent {
  const vpcDep: BlueprintComponentDependency = {id: vpc.id};
  const wiredSubnets = subnetNodes.map(n => ({
    ...n.subnet,
    dependencies: [...n.subnet.dependencies, vpcDep],
  }));
  const wiredSgs = sgs.map(sg => ({...sg, dependencies: [vpcDep]}));
  const allVMs = subnetNodes.flatMap(n => n.virtualMachines);
  const allEcsSvcs = subnetNodes.flatMap(n => n.workloads);
  return {
    vpc,
    subnets: wiredSubnets,
    securityGroups: wiredSgs,
    virtualMachines: allVMs,
    workloads: allEcsSvcs,
    components: [vpc, ...wiredSubnets, ...wiredSgs, ...allVMs, ...allEcsSvcs],
    withSubnets: newSubnets =>
      makeVirtualNetworkComponent(vpc, newSubnets, sgs),
    withSecurityGroups: newSgs =>
      makeVirtualNetworkComponent(vpc, subnetNodes, newSgs),
  };
}

export type VirtualNetworkBuilder = {
  withId: (id: string) => VirtualNetworkBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => VirtualNetworkBuilder;
  withDisplayName: (displayName: string) => VirtualNetworkBuilder;
  withDescription: (description: string) => VirtualNetworkBuilder;
  withCidrBlock: (cidrBlock: string) => VirtualNetworkBuilder;
  withSubnet: (builder: SubnetBuilder) => VirtualNetworkBuilder;
  withSecurityGroup: (builder: SecurityGroupBuilder) => VirtualNetworkBuilder;
  withLinks: (links: ComponentLink[]) => VirtualNetworkBuilder;
  build: () => VirtualNetworkResult;
};

export type VirtualNetworkConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock?: string;
};

export namespace VirtualNetwork {
  export const getBuilder = (): VirtualNetworkBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildVirtualNetworkType())
      .withParameters(params);

    const subnetBuilders: SubnetBuilder[] = [];
    const sgBuilders: SecurityGroupBuilder[] = [];

    const builder: VirtualNetworkBuilder = {
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
      withSubnet: subnetBuilder => {
        subnetBuilders.push(subnetBuilder);
        return builder;
      },
      withSecurityGroup: sgBuilder => {
        sgBuilders.push(sgBuilder);
        return builder;
      },
      withLinks: links => {
        inner.withLinks(links);
        return builder;
      },
      build: (): VirtualNetworkResult => {
        const vpc = inner.build();
        const vpcDep: BlueprintComponentDependency = {id: vpc.id};

        const subnetResults = subnetBuilders.map(b => b.build());
        const subnets = subnetResults.map(r => ({
          ...r.subnet,
          dependencies: [...r.subnet.dependencies, vpcDep],
        }));
        const virtualMachines = subnetResults.flatMap(r => r.virtualMachines);

        const securityGroups = sgBuilders.map(b => ({
          ...b.build(),
          dependencies: [vpcDep],
        }));

        return {
          vpc,
          subnets,
          securityGroups,
          virtualMachines,
          components: [vpc, ...subnets, ...securityGroups, ...virtualMachines],
        };
      },
    };

    return builder;
  };

  export const create = (
    config: VirtualNetworkConfig,
  ): VirtualNetworkComponent => {
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

    return makeVirtualNetworkComponent(b.build().vpc, [], []);
  };
}
