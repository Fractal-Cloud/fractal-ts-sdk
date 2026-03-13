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

export const CAAS_MESSAGING_ENTITY_TYPE_NAME = 'Entity';

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

function buildCaaSMessagingEntityType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_MESSAGING_ENTITY_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type CaaSMessagingEntityComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type CaaSMessagingEntityBuilder = {
  withId: (id: string) => CaaSMessagingEntityBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSMessagingEntityBuilder;
  withDisplayName: (displayName: string) => CaaSMessagingEntityBuilder;
  withDescription: (description: string) => CaaSMessagingEntityBuilder;
  build: () => BlueprintComponent;
};

export type CaaSMessagingEntityConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeCaaSMessagingEntityComponent(
  component: BlueprintComponent,
): CaaSMessagingEntityComponent {
  return {component, components: [component]};
}

export namespace CaaSMessagingEntity {
  export const getBuilder = (): CaaSMessagingEntityBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildCaaSMessagingEntityType())
      .withParameters(getParametersInstance());

    const builder: CaaSMessagingEntityBuilder = {
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
    config: CaaSMessagingEntityConfig,
  ): CaaSMessagingEntityComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeCaaSMessagingEntityComponent(b.build());
  };
}
