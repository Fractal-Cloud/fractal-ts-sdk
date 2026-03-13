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

export const ML_EXPERIMENT_TYPE_NAME = 'MlExperiment';
export const EXPERIMENT_NAME_PARAM = 'experimentName';

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

function buildMlExperimentType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ML_EXPERIMENT_TYPE_NAME).build(),
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

export type MlExperimentComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type MlExperimentBuilder = {
  withId: (id: string) => MlExperimentBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => MlExperimentBuilder;
  withDisplayName: (displayName: string) => MlExperimentBuilder;
  withDescription: (description: string) => MlExperimentBuilder;
  withExperimentName: (name: string) => MlExperimentBuilder;
  build: () => BlueprintComponent;
};

export type MlExperimentConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  experimentName?: string;
};

function makeMlExperimentComponent(
  component: BlueprintComponent,
): MlExperimentComponent {
  return {component, components: [component]};
}

export namespace MlExperiment {
  export const getBuilder = (): MlExperimentBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildMlExperimentType())
      .withParameters(params);

    const builder: MlExperimentBuilder = {
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
      withExperimentName: name => {
        pushParam(params, EXPERIMENT_NAME_PARAM, name);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: MlExperimentConfig): MlExperimentComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.experimentName) b.withExperimentName(config.experimentName);

    return makeMlExperimentComponent(b.build());
  };
}
