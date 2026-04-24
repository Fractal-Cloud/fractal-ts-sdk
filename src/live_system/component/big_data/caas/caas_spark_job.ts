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

const CAAS_SPARK_JOB_TYPE_NAME = 'SparkJob';
const SCHEDULE_PARAM = 'schedule';
const JAR_URI_PARAM = 'jarUri';
const MAIN_CLASS_PARAM = 'mainClass';

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
      PascalCaseString.getBuilder().withValue(CAAS_SPARK_JOB_TYPE_NAME).build(),
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

export type SatisfiedCaaSSparkJobBuilder = {
  withSchedule: (schedule: string) => SatisfiedCaaSSparkJobBuilder;
  withJarUri: (jarUri: string) => SatisfiedCaaSSparkJobBuilder;
  withMainClass: (mainClass: string) => SatisfiedCaaSSparkJobBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkJobBuilder = {
  withId: (id: string) => CaaSSparkJobBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSSparkJobBuilder;
  withDisplayName: (displayName: string) => CaaSSparkJobBuilder;
  withDescription: (description: string) => CaaSSparkJobBuilder;
  withSchedule: (schedule: string) => CaaSSparkJobBuilder;
  withJarUri: (jarUri: string) => CaaSSparkJobBuilder;
  withMainClass: (mainClass: string) => CaaSSparkJobBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkJobConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  schedule?: string;
  jarUri?: string;
  mainClass?: string;
};

export namespace CaaSSparkJob {
  export const getBuilder = (): CaaSSparkJobBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSSparkJobBuilder = {
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
      withSchedule: v => {
        pushParam(params, SCHEDULE_PARAM, v);
        return builder;
      },
      withJarUri: v => {
        pushParam(params, JAR_URI_PARAM, v);
        return builder;
      },
      withMainClass: v => {
        pushParam(params, MAIN_CLASS_PARAM, v);
        return builder;
      },
      build: () => inner.build(),
    };
    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSSparkJobBuilder => {
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

    const satisfiedBuilder: SatisfiedCaaSSparkJobBuilder = {
      withSchedule: v => {
        pushParam(params, SCHEDULE_PARAM, v);
        return satisfiedBuilder;
      },
      withJarUri: v => {
        pushParam(params, JAR_URI_PARAM, v);
        return satisfiedBuilder;
      },
      withMainClass: v => {
        pushParam(params, MAIN_CLASS_PARAM, v);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };
    return satisfiedBuilder;
  };

  export const create = (config: CaaSSparkJobConfig): LiveSystemComponent => {
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
    if (config.schedule) {
      b.withSchedule(config.schedule);
    }
    if (config.jarUri) {
      b.withJarUri(config.jarUri);
    }
    if (config.mainClass) {
      b.withMainClass(config.mainClass);
    }
    return b.build();
  };
}
