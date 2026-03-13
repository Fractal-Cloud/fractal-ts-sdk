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

// Agent constant: COLLECTION_COMPONENT_NAME = "Collection"
const COLLECTION_TYPE_NAME = 'Collection';

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

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(COLLECTION_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — no vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint.
 */
export type SatisfiedGcpFirestoreCollectionBuilder = {
  build: () => LiveSystemComponent;
};

export type GcpFirestoreCollectionBuilder = {
  withId: (id: string) => GcpFirestoreCollectionBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpFirestoreCollectionBuilder;
  withDisplayName: (displayName: string) => GcpFirestoreCollectionBuilder;
  withDescription: (description: string) => GcpFirestoreCollectionBuilder;
  build: () => LiveSystemComponent;
};

export type GcpFirestoreCollectionConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace GcpFirestoreCollection {
  export const getBuilder = (): GcpFirestoreCollectionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpFirestoreCollectionBuilder = {
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

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpFirestoreCollectionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP')
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

    if (blueprint.description) inner.withDescription(blueprint.description);

    const satisfiedBuilder: SatisfiedGcpFirestoreCollectionBuilder = {
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: GcpFirestoreCollectionConfig,
  ): LiveSystemComponent => {
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
