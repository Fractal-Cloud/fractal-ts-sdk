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
import {ComponentLink, getLinkBuilder} from '../../../../component/link';
import {SecurityGroupComponent} from './security_group';

export const VIRTUAL_MACHINE_TYPE_NAME = 'VirtualMachine';

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

function buildVirtualMachineType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(VIRTUAL_MACHINE_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type VmPortLink = {
  target: VirtualMachineComponent;
  fromPort: number;
  toPort?: number;
  protocol?: string;
};

export type VirtualMachineComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
  /** Declares a traffic rule from this VM to another. The agent derives managed SG egress/ingress rules. */
  linkToVirtualMachine: (links: VmPortLink[]) => VirtualMachineComponent;
  /** Declares SG membership. The agent assigns the VM to the given security group at launch. No settings required. */
  linkToSecurityGroup: (
    sgs: SecurityGroupComponent[],
  ) => VirtualMachineComponent;
};

function buildLinkParams(link: VmPortLink): GenericParameters {
  const params = getParametersInstance();
  params.push('fromPort', link.fromPort as unknown as Record<string, object>);
  if (link.toPort !== undefined) {
    params.push('toPort', link.toPort as unknown as Record<string, object>);
  }
  if (link.protocol) {
    params.push('protocol', link.protocol as unknown as Record<string, object>);
  }
  return params;
}

function makeVirtualMachineComponent(
  component: BlueprintComponent,
): VirtualMachineComponent {
  return {
    component,
    components: [component],
    linkToVirtualMachine: (links: VmPortLink[]) => {
      const componentLinks: ComponentLink[] = links.map(l =>
        getLinkBuilder()
          .withId(l.target.component.id)
          .withType(buildVirtualMachineType())
          .withParameters(buildLinkParams(l))
          .build(),
      );
      return makeVirtualMachineComponent({
        ...component,
        links: [...component.links, ...componentLinks],
      });
    },
    linkToSecurityGroup: (sgs: SecurityGroupComponent[]) => {
      const sgLinks: ComponentLink[] = sgs.map(sg =>
        getLinkBuilder()
          .withId(sg.id)
          .withType(sg.type)
          .withParameters(getParametersInstance())
          .build(),
      );
      return makeVirtualMachineComponent({
        ...component,
        links: [...component.links, ...sgLinks],
      });
    },
  };
}

export type VirtualMachineBuilder = {
  withId: (id: string) => VirtualMachineBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => VirtualMachineBuilder;
  withDisplayName: (displayName: string) => VirtualMachineBuilder;
  withDescription: (description: string) => VirtualMachineBuilder;
  withLinks: (links: ComponentLink[]) => VirtualMachineBuilder;
  build: () => BlueprintComponent;
};

export type VirtualMachineConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace VirtualMachine {
  export const getBuilder = (): VirtualMachineBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildVirtualMachineType())
      .withParameters(getParametersInstance());

    const builder: VirtualMachineBuilder = {
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
      withLinks: links => {
        inner.withLinks(links);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: VirtualMachineConfig,
  ): VirtualMachineComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeVirtualMachineComponent(b.build());
  };
}
