import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';

// Agent constant: ECS_COMPONENT_NAME = "ECS"
const ECS_CLUSTER_TYPE_NAME = 'ECS';

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

function buildAwsEcsClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ECS_CLUSTER_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — id, version, and displayName are locked from the
 * blueprint ContainerPlatform. No AWS-specific parameters are needed for a
 * basic ECS cluster, so only build() is exposed.
 */
export type SatisfiedAwsEcsClusterBuilder = {
  build: () => LiveSystemComponent;
};

export type AwsEcsClusterBuilder = {
  withId: (id: string) => AwsEcsClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsEcsClusterBuilder;
  withDisplayName: (displayName: string) => AwsEcsClusterBuilder;
  withDescription: (description: string) => AwsEcsClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AwsEcsClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace AwsEcsCluster {
  export const getBuilder = (): AwsEcsClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsClusterType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsEcsClusterBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint ContainerPlatform component as an AWS ECS Cluster.
   * Carries id, version, displayName, and description from the blueprint.
   */
  export const satisfy = (
    platform: BlueprintComponent,
  ): SatisfiedAwsEcsClusterBuilder => {
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsClusterType())
      .withParameters(getParametersInstance())
      .withProvider('AWS')
      .withId(buildId(platform.id.toString()))
      .withVersion(
        buildVersion(
          platform.version.major,
          platform.version.minor,
          platform.version.patch,
        ),
      )
      .withDisplayName(platform.displayName);

    if (platform.description) inner.withDescription(platform.description);

    return {build: () => inner.build()};
  };

  export const create = (config: AwsEcsClusterConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return b.build();
  };
}
