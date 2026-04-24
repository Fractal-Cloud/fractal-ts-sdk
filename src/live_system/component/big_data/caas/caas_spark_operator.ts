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

const CAAS_SPARK_OPERATOR_TYPE_NAME = 'SparkOperator';
const NAMESPACE_PARAM = 'namespace';
const WEBHOOK_ENABLED_PARAM = 'webhookEnabled';

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
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_SPARK_OPERATOR_TYPE_NAME)
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

export type SatisfiedCaaSSparkOperatorBuilder = {
  withNamespace: (ns: string) => SatisfiedCaaSSparkOperatorBuilder;
  withWebhookEnabled: (enabled: boolean) => SatisfiedCaaSSparkOperatorBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkOperatorBuilder = {
  withId: (id: string) => CaaSSparkOperatorBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSSparkOperatorBuilder;
  withDisplayName: (displayName: string) => CaaSSparkOperatorBuilder;
  withDescription: (description: string) => CaaSSparkOperatorBuilder;
  withNamespace: (ns: string) => CaaSSparkOperatorBuilder;
  withWebhookEnabled: (enabled: boolean) => CaaSSparkOperatorBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkOperatorConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  webhookEnabled?: boolean;
};

export namespace CaaSSparkOperator {
  export const getBuilder = (): CaaSSparkOperatorBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSSparkOperatorBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: dn => {
        inner.withDisplayName(dn);
        return builder;
      },
      withDescription: d => {
        inner.withDescription(d);
        return builder;
      },
      withNamespace: ns => {
        pushParam(params, NAMESPACE_PARAM, ns);
        return builder;
      },
      withWebhookEnabled: e => {
        pushParam(params, WEBHOOK_ENABLED_PARAM, e);
        return builder;
      },
      build: () => inner.build(),
    };
    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSSparkOperatorBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS')
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

    const satisfiedBuilder: SatisfiedCaaSSparkOperatorBuilder = {
      withNamespace: ns => {
        pushParam(params, NAMESPACE_PARAM, ns);
        return satisfiedBuilder;
      },
      withWebhookEnabled: e => {
        pushParam(params, WEBHOOK_ENABLED_PARAM, e);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };
    return satisfiedBuilder;
  };

  export const create = (
    config: CaaSSparkOperatorConfig,
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
    if (config.namespace) {
      b.withNamespace(config.namespace);
    }
    if (config.webhookEnabled !== undefined) {
      b.withWebhookEnabled(config.webhookEnabled);
    }
    return b.build();
  };
}
