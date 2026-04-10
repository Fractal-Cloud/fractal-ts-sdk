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

// Agent constant: OfferSecurityGroup = "NetworkAndCompute.CaaS.OpenshiftSecurityGroup"
const OPENSHIFT_SG_TYPE_NAME = 'OpenshiftSecurityGroup';
const NAME_PARAM = 'name';
const POLICY_TYPE_PARAM = 'policyType';
const POD_SELECTOR_PARAM = 'podSelector';
const EGRESS_RULES_PARAM = 'egressRules';

// Re-export for consumers that import IngressRule from the live system module
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

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

function buildOpenshiftSecurityGroupType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_SG_TYPE_NAME).build(),
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

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links, ingressRules) are locked to the blueprint
 * and cannot be overridden.
 */
export type SatisfiedOpenshiftSecurityGroupBuilder = {
  withName: (name: string) => SatisfiedOpenshiftSecurityGroupBuilder;
  withPolicyType: (
    policyType: string,
  ) => SatisfiedOpenshiftSecurityGroupBuilder;
  withPodSelector: (
    podSelector: string,
  ) => SatisfiedOpenshiftSecurityGroupBuilder;
  withEgressRules: (
    egressRules: string,
  ) => SatisfiedOpenshiftSecurityGroupBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftSecurityGroupBuilder = {
  withId: (id: string) => OpenshiftSecurityGroupBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OpenshiftSecurityGroupBuilder;
  withDisplayName: (displayName: string) => OpenshiftSecurityGroupBuilder;
  withDescription: (description: string) => OpenshiftSecurityGroupBuilder;
  withName: (name: string) => OpenshiftSecurityGroupBuilder;
  withPolicyType: (policyType: string) => OpenshiftSecurityGroupBuilder;
  withPodSelector: (podSelector: string) => OpenshiftSecurityGroupBuilder;
  withIngressRules: (rules: IngressRule[]) => OpenshiftSecurityGroupBuilder;
  withEgressRules: (egressRules: string) => OpenshiftSecurityGroupBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftSecurityGroupConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  name: string;
  policyType?: string;
  podSelector?: string;
  ingressRules?: string;
  egressRules?: string;
};

export namespace OpenshiftSecurityGroup {
  export const getBuilder = (): OpenshiftSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftSecurityGroupType())
      .withParameters(params)
      .withProvider('RedHat');

    const builder: OpenshiftSecurityGroupBuilder = {
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
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withPolicyType: value => {
        pushParam(params, POLICY_TYPE_PARAM, value);
        return builder;
      },
      withPodSelector: value => {
        pushParam(params, POD_SELECTOR_PARAM, value);
        return builder;
      },
      withIngressRules: rules => {
        pushParam(params, INGRESS_RULES_PARAM, rules);
        return builder;
      },
      withEgressRules: value => {
        pushParam(params, EGRESS_RULES_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOpenshiftSecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftSecurityGroupType())
      .withParameters(params)
      .withProvider('RedHat')
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
      pushParam(params, INGRESS_RULES_PARAM, ingressRules as IngressRule[]);

    const satisfiedBuilder: SatisfiedOpenshiftSecurityGroupBuilder = {
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withPolicyType: value => {
        pushParam(params, POLICY_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withPodSelector: value => {
        pushParam(params, POD_SELECTOR_PARAM, value);
        return satisfiedBuilder;
      },
      withEgressRules: value => {
        pushParam(params, EGRESS_RULES_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: OpenshiftSecurityGroupConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withName(config.name);

    if (config.description) b.withDescription(config.description);
    if (config.policyType) b.withPolicyType(config.policyType);
    if (config.podSelector) b.withPodSelector(config.podSelector);
    if (config.ingressRules)
      b.withIngressRules(JSON.parse(config.ingressRules));
    if (config.egressRules) b.withEgressRules(config.egressRules);

    return b.build();
  };
}
