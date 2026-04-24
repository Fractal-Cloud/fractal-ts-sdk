import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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
import {CIDR_BLOCK_PARAM} from '../../../../fractal/component/network_and_compute/iaas/subnet';

// Matches aria-agent-aruba handlers/subnet.go: NetworkAndCompute.IaaS.ArubaSubnet
const ARUBA_SUBNET_TYPE_NAME = 'ArubaSubnet';

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

function buildArubaSubnetType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_SUBNET_TYPE_NAME).build(),
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

export type SatisfiedArubaSubnetBuilder = {
  build: () => LiveSystemComponent;
};

export type ArubaSubnetBuilder = {
  withId: (id: string) => ArubaSubnetBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaSubnetBuilder;
  withDisplayName: (displayName: string) => ArubaSubnetBuilder;
  withDescription: (description: string) => ArubaSubnetBuilder;
  withCidrBlock: (cidrBlock: string) => ArubaSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaSubnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
};

export namespace ArubaSubnet {
  export const getBuilder = (): ArubaSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaSubnetType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaSubnetBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaSubnetType())
      .withParameters(params)
      .withProvider('Aruba')
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

    const cidrBlock =
      blueprint.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM);
    if (cidrBlock !== null) {
      pushParam(params, CIDR_BLOCK_PARAM, String(cidrBlock));
    }

    const satisfiedBuilder: SatisfiedArubaSubnetBuilder = {
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ArubaSubnetConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock);

    if (config.description) {
      b.withDescription(config.description);
    }

    return b.build();
  };
}
