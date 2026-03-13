import {getBlueprintComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';
import {BlueprintComponentDependency} from '../../dependency';
import {SearchEntityComponent} from './search_entity';

export const SEARCH_TYPE_NAME = 'Search';

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

function buildSearchType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(SEARCH_TYPE_NAME).build())
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SearchComponent = {
  readonly search: BlueprintComponent;
  readonly entities: ReadonlyArray<SearchEntityComponent>;
  withEntities: (entities: SearchEntityComponent[]) => SearchComponent;
};

export type SearchBuilder = {
  withId: (id: string) => SearchBuilder;
  withVersion: (major: number, minor: number, patch: number) => SearchBuilder;
  withDisplayName: (displayName: string) => SearchBuilder;
  withDescription: (description: string) => SearchBuilder;
  build: () => BlueprintComponent;
};

export type SearchConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeSearchComponent(
  search: BlueprintComponent,
  entityNodes: SearchEntityComponent[],
): SearchComponent {
  const searchDep: BlueprintComponentDependency = {id: search.id};
  const wiredEntities = entityNodes.map(e => ({
    ...e,
    component: {
      ...e.component,
      dependencies: [...e.component.dependencies, searchDep],
    },
  }));
  return {
    search,
    entities: wiredEntities,
    withEntities: newEntities => makeSearchComponent(search, newEntities),
  };
}

export namespace Search {
  export const getBuilder = (): SearchBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildSearchType())
      .withParameters(getParametersInstance());

    const builder: SearchBuilder = {
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

  export const create = (config: SearchConfig): SearchComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeSearchComponent(b.build(), []);
  };
}
