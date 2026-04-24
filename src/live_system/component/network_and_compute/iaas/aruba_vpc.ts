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

// Matches aria-agent-aruba handlers/vpc.go: NetworkAndCompute.IaaS.ArubaVpc
const ARUBA_VPC_TYPE_NAME = 'ArubaVpc';
const NAME_PARAM = 'name';
const LOCATION_PARAM = 'location';

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

function buildArubaVpcType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_VPC_TYPE_NAME).build(),
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

export type SatisfiedArubaVpcBuilder = {
  withName: (name: string) => SatisfiedArubaVpcBuilder;
  withLocation: (location: string) => SatisfiedArubaVpcBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaVpcBuilder = {
  withId: (id: string) => ArubaVpcBuilder;
  withVersion: (major: number, minor: number, patch: number) => ArubaVpcBuilder;
  withDisplayName: (displayName: string) => ArubaVpcBuilder;
  withDescription: (description: string) => ArubaVpcBuilder;
  withName: (name: string) => ArubaVpcBuilder;
  withLocation: (location: string) => ArubaVpcBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaVpcConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  name?: string;
  location?: string;
};

export namespace ArubaVpc {
  export const getBuilder = (): ArubaVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaVpcType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaVpcBuilder = {
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
      withName: name => {
        pushParam(params, NAME_PARAM, name);
        return builder;
      },
      withLocation: location => {
        pushParam(params, LOCATION_PARAM, location);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaVpcType())
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

    const satisfiedBuilder: SatisfiedArubaVpcBuilder = {
      withName: name => {
        pushParam(params, NAME_PARAM, name);
        return satisfiedBuilder;
      },
      withLocation: location => {
        pushParam(params, LOCATION_PARAM, location);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ArubaVpcConfig): LiveSystemComponent => {
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
    if (config.name) {
      b.withName(config.name);
    }
    if (config.location) {
      b.withLocation(config.location);
    }

    return b.build();
  };
}
