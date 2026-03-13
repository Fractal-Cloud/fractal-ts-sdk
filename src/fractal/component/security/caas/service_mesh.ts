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

export const SERVICE_MESH_TYPE_NAME = 'ServiceMeshsecurity';

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

function buildServiceMeshType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(SERVICE_MESH_TYPE_NAME).build(),
    )
    .build();
}

// -- Public API ----------------------------------------------------------------

export type ServiceMeshComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type ServiceMeshBuilder = {
  withId: (id: string) => ServiceMeshBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ServiceMeshBuilder;
  withDisplayName: (displayName: string) => ServiceMeshBuilder;
  withDescription: (description: string) => ServiceMeshBuilder;
  build: () => BlueprintComponent;
};

export type ServiceMeshConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeServiceMeshComponent(
  component: BlueprintComponent,
): ServiceMeshComponent {
  return {component, components: [component]};
}

export namespace ServiceMesh {
  export const getBuilder = (): ServiceMeshBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildServiceMeshType())
      .withParameters(getParametersInstance());

    const builder: ServiceMeshBuilder = {
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

  export const create = (config: ServiceMeshConfig): ServiceMeshComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeServiceMeshComponent(b.build());
  };
}
