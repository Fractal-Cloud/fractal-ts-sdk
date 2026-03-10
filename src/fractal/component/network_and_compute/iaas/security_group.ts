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
import {ComponentLink} from '../../../../component/link';

export const SECURITY_GROUP_TYPE_NAME = 'SecurityGroup';
export const DESCRIPTION_PARAM = 'description';
export const INGRESS_RULES_PARAM = 'ingressRules';

export type IngressRule = {
  protocol?: string;
  fromPort: number;
  toPort?: number;
  sourceCidr?: string;
  sourceGroupId?: string;
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

function buildSecurityGroupType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(SECURITY_GROUP_TYPE_NAME).build(),
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

export type SecurityGroupBuilder = {
  withId: (id: string) => SecurityGroupBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => SecurityGroupBuilder;
  withDisplayName: (displayName: string) => SecurityGroupBuilder;
  withDescription: (description: string) => SecurityGroupBuilder;
  withIngressRules: (rules: IngressRule[]) => SecurityGroupBuilder;
  withLinks: (links: ComponentLink[]) => SecurityGroupBuilder;
  build: () => SecurityGroupComponent;
};

export type SecurityGroupConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description: string;
  ingressRules?: IngressRule[];
};

/** A BlueprintComponent that is guaranteed to be a SecurityGroup. */
export type SecurityGroupComponent = BlueprintComponent & {
  readonly _brand: 'SecurityGroup';
};

export namespace SecurityGroup {
  export const getBuilder = (): SecurityGroupBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildSecurityGroupType())
      .withParameters(params);

    const builder: SecurityGroupBuilder = {
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
      withLinks: links => {
        inner.withLinks(links);
        return builder;
      },
      build: () => inner.build() as SecurityGroupComponent,
    };

    return builder;
  };

  export const create = (
    config: SecurityGroupConfig,
  ): SecurityGroupComponent => {
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
