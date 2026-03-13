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

export const API_MANAGEMENT_UNMANAGED_TYPE_NAME = 'Unmanaged';

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

function buildApiManagementUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(API_MANAGEMENT_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

// -- Public API ----------------------------------------------------------------

export type ApiManagementUnmanagedComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type ApiManagementUnmanagedBuilder = {
  withId: (id: string) => ApiManagementUnmanagedBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ApiManagementUnmanagedBuilder;
  withDisplayName: (displayName: string) => ApiManagementUnmanagedBuilder;
  withDescription: (description: string) => ApiManagementUnmanagedBuilder;
  build: () => BlueprintComponent;
};

export type ApiManagementUnmanagedConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeApiManagementUnmanagedComponent(
  component: BlueprintComponent,
): ApiManagementUnmanagedComponent {
  return {component, components: [component]};
}

export namespace ApiManagementUnmanaged {
  export const getBuilder = (): ApiManagementUnmanagedBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildApiManagementUnmanagedType())
      .withParameters(getParametersInstance());

    const builder: ApiManagementUnmanagedBuilder = {
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
    config: ApiManagementUnmanagedConfig,
  ): ApiManagementUnmanagedComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeApiManagementUnmanagedComponent(b.build());
  };
}
