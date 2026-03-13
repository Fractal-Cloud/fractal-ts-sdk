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

export const SECURITY_UNMANAGED_TYPE_NAME = 'Unmanaged';

// -- internal helpers ----------------------------------------------------------

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

function buildSecurityUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(SECURITY_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

// -- Public API ----------------------------------------------------------------

export type SecurityUnmanagedComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type SecurityUnmanagedBuilder = {
  withId: (id: string) => SecurityUnmanagedBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => SecurityUnmanagedBuilder;
  withDisplayName: (displayName: string) => SecurityUnmanagedBuilder;
  withDescription: (description: string) => SecurityUnmanagedBuilder;
  build: () => BlueprintComponent;
};

export type SecurityUnmanagedConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeSecurityUnmanagedComponent(
  component: BlueprintComponent,
): SecurityUnmanagedComponent {
  return {component, components: [component]};
}

export namespace SecurityUnmanaged {
  export const getBuilder = (): SecurityUnmanagedBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildSecurityUnmanagedType())
      .withParameters(getParametersInstance());

    const builder: SecurityUnmanagedBuilder = {
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
    config: SecurityUnmanagedConfig,
  ): SecurityUnmanagedComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeSecurityUnmanagedComponent(b.build());
  };
}
