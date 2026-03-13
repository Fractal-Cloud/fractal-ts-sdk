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

export const BIG_DATA_UNMANAGED_TYPE_NAME = 'Unmanaged';

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

function buildBigDataUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(BIG_DATA_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BigDataUnmanagedComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type BigDataUnmanagedBuilder = {
  withId: (id: string) => BigDataUnmanagedBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => BigDataUnmanagedBuilder;
  withDisplayName: (displayName: string) => BigDataUnmanagedBuilder;
  withDescription: (description: string) => BigDataUnmanagedBuilder;
  build: () => BlueprintComponent;
};

export type BigDataUnmanagedConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeBigDataUnmanagedComponent(
  component: BlueprintComponent,
): BigDataUnmanagedComponent {
  return {component, components: [component]};
}

export namespace BigDataUnmanaged {
  export const getBuilder = (): BigDataUnmanagedBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildBigDataUnmanagedType())
      .withParameters(getParametersInstance());

    const builder: BigDataUnmanagedBuilder = {
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
    config: BigDataUnmanagedConfig,
  ): BigDataUnmanagedComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeBigDataUnmanagedComponent(b.build());
  };
}
