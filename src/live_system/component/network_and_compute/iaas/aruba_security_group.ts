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
import {
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
  IngressRule,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

// Matches aria-agent-aruba handlers/security_group.go: NetworkAndCompute.IaaS.ArubaSecurityGroup
const ARUBA_SECURITY_GROUP_TYPE_NAME = 'ArubaSecurityGroup';
const NAME_PARAM = 'name';

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

function buildType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_SECURITY_GROUP_TYPE_NAME)
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

export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

export type SatisfiedArubaSecurityGroupBuilder = {
  withName: (name: string) => SatisfiedArubaSecurityGroupBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaSecurityGroupBuilder = {
  withId: (id: string) => ArubaSecurityGroupBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaSecurityGroupBuilder;
  withDisplayName: (displayName: string) => ArubaSecurityGroupBuilder;
  withDescription: (description: string) => ArubaSecurityGroupBuilder;
  withIngressRules: (rules: IngressRule[]) => ArubaSecurityGroupBuilder;
  withName: (name: string) => ArubaSecurityGroupBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaSecurityGroupConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  ingressRules?: IngressRule[];
  name?: string;
};

export namespace ArubaSecurityGroup {
  export const getBuilder = (): ArubaSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaSecurityGroupBuilder = {
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
        pushParam(params, DESCRIPTION_PARAM, description);
        return builder;
      },
      withIngressRules: rules => {
        pushParam(params, INGRESS_RULES_PARAM, rules);
        return builder;
      },
      withName: name => {
        pushParam(params, NAME_PARAM, name);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    const description =
      blueprint.parameters.getOptionalFieldByName(DESCRIPTION_PARAM);
    if (description !== null) {
      inner.withDescription(String(description));
      pushParam(params, DESCRIPTION_PARAM, String(description));
    } else if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    const ingressRules =
      blueprint.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM);
    if (ingressRules !== null) {
      pushParam(params, INGRESS_RULES_PARAM, ingressRules as IngressRule[]);
    }

    const satisfiedBuilder: SatisfiedArubaSecurityGroupBuilder = {
      withName: name => {
        pushParam(params, NAME_PARAM, name);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: ArubaSecurityGroupConfig,
  ): LiveSystemComponent => {
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
    if (config.ingressRules && config.ingressRules.length > 0) {
      b.withIngressRules(config.ingressRules);
    }
    if (config.name) {
      b.withName(config.name);
    }

    return b.build();
  };
}
