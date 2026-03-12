import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';

export const FILES_AND_BLOBS_TYPE_NAME = 'FilesAndBlobs';

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

function buildFilesAndBlobsType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(FILES_AND_BLOBS_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type FilesAndBlobsComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type FilesAndBlobsBuilder = {
  withId: (id: string) => FilesAndBlobsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => FilesAndBlobsBuilder;
  withDisplayName: (displayName: string) => FilesAndBlobsBuilder;
  withDescription: (description: string) => FilesAndBlobsBuilder;
  build: () => BlueprintComponent;
};

export type FilesAndBlobsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeFilesAndBlobsComponent(
  component: BlueprintComponent,
): FilesAndBlobsComponent {
  return {component, components: [component]};
}

export namespace FilesAndBlobs {
  export const getBuilder = (): FilesAndBlobsBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildFilesAndBlobsType())
      .withParameters(getParametersInstance());

    const builder: FilesAndBlobsBuilder = {
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

  export const create = (
    config: FilesAndBlobsConfig,
  ): FilesAndBlobsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeFilesAndBlobsComponent(b.build());
  };
}
