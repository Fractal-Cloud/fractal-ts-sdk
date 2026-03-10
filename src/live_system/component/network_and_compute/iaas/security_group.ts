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
import {
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
  IngressRule,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

// Agent constant: SEC_GROUP_COMPONENT_NAME = "SecurityGroup"
const AWS_SG_TYPE_NAME = 'SecurityGroup';

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

function buildAwsSgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(AWS_SG_TYPE_NAME).build())
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// Re-export for consumers that import IngressRule from the live system module
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — structural properties (id, version, displayName,
 * description, dependencies, links, ingressRules) are locked to the blueprint
 * and cannot be overridden.
 */
export type SatisfiedAwsSecurityGroupBuilder = {
  build: () => LiveSystemComponent;
};

export type AwsSecurityGroupBuilder = {
  withId: (id: string) => AwsSecurityGroupBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsSecurityGroupBuilder;
  withDisplayName: (displayName: string) => AwsSecurityGroupBuilder;
  withDescription: (description: string) => AwsSecurityGroupBuilder;
  withIngressRules: (rules: IngressRule[]) => AwsSecurityGroupBuilder;
  build: () => LiveSystemComponent;
};

export type AwsSecurityGroupConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description: string;
  ingressRules?: IngressRule[];
};

export namespace AwsSecurityGroup {
  export const getBuilder = (): AwsSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsSgType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsSecurityGroupBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsSgType())
      .withParameters(params)
      .withProvider('AWS')
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
    if (ingressRules !== null)
      pushParam(
        params,
        INGRESS_RULES_PARAM,
        ingressRules as unknown as IngressRule[],
      );

    const satisfiedBuilder: SatisfiedAwsSecurityGroupBuilder = {
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AwsSecurityGroupConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withDescription(config.description);

    if (config.ingressRules && config.ingressRules.length > 0)
      b.withIngressRules(config.ingressRules);

    return b.build();
  };
}
