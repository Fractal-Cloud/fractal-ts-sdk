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

const CAAS_MLFLOW_TYPE_NAME = 'SparkMlExperiment';
const NAMESPACE_PARAM = 'namespace';
const TRACKING_URI_PARAM = 'trackingUri';
const ARTIFACT_ROOT_PARAM = 'artifactRoot';

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
      PascalCaseString.getBuilder().withValue(CAAS_MLFLOW_TYPE_NAME).build(),
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

export type SatisfiedCaaSMlflowBuilder = {
  withNamespace: (ns: string) => SatisfiedCaaSMlflowBuilder;
  withTrackingUri: (uri: string) => SatisfiedCaaSMlflowBuilder;
  withArtifactRoot: (root: string) => SatisfiedCaaSMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSMlflowBuilder = {
  withId: (id: string) => CaaSMlflowBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSMlflowBuilder;
  withDisplayName: (displayName: string) => CaaSMlflowBuilder;
  withDescription: (description: string) => CaaSMlflowBuilder;
  withNamespace: (ns: string) => CaaSMlflowBuilder;
  withTrackingUri: (uri: string) => CaaSMlflowBuilder;
  withArtifactRoot: (root: string) => CaaSMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSMlflowConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  trackingUri?: string;
  artifactRoot?: string;
};

export namespace CaaSMlflow {
  export const getBuilder = (): CaaSMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSMlflowBuilder = {
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
      withNamespace: v => {
        pushParam(params, NAMESPACE_PARAM, v);
        return builder;
      },
      withTrackingUri: v => {
        pushParam(params, TRACKING_URI_PARAM, v);
        return builder;
      },
      withArtifactRoot: v => {
        pushParam(params, ARTIFACT_ROOT_PARAM, v);
        return builder;
      },
      build: () => inner.build(),
    };
    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSMlflowBuilder => {
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

    const satisfiedBuilder: SatisfiedCaaSMlflowBuilder = {
      withNamespace: v => {
        pushParam(params, NAMESPACE_PARAM, v);
        return satisfiedBuilder;
      },
      withTrackingUri: v => {
        pushParam(params, TRACKING_URI_PARAM, v);
        return satisfiedBuilder;
      },
      withArtifactRoot: v => {
        pushParam(params, ARTIFACT_ROOT_PARAM, v);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };
    return satisfiedBuilder;
  };

  export const create = (config: CaaSMlflowConfig): LiveSystemComponent => {
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
    if (config.trackingUri) {
      b.withTrackingUri(config.trackingUri);
    }
    if (config.artifactRoot) {
      b.withArtifactRoot(config.artifactRoot);
    }
    return b.build();
  };
}
