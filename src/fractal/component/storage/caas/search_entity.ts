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

export const SEARCH_ENTITY_TYPE_NAME = 'SearchEntity';

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

function buildSearchEntityType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(SEARCH_ENTITY_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SearchEntityComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type SearchEntityBuilder = {
  withId: (id: string) => SearchEntityBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => SearchEntityBuilder;
  withDisplayName: (displayName: string) => SearchEntityBuilder;
  withDescription: (description: string) => SearchEntityBuilder;
  build: () => BlueprintComponent;
};

export type SearchEntityConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeSearchEntityComponent(
  component: BlueprintComponent,
): SearchEntityComponent {
  return {component, components: [component]};
}

export namespace SearchEntity {
  export const getBuilder = (): SearchEntityBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildSearchEntityType())
      .withParameters(getParametersInstance());

    const builder: SearchEntityBuilder = {
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

  export const create = (config: SearchEntityConfig): SearchEntityComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeSearchEntityComponent(b.build());
  };
}
