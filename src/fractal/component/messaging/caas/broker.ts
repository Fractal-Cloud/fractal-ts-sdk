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
import {CaaSMessagingEntityComponent} from './entity';

export const CAAS_BROKER_TYPE_NAME = 'Broker';

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

function buildCaaSBrokerType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CAAS_BROKER_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type CaaSBrokerComponent = {
  readonly broker: BlueprintComponent;
  readonly entities: ReadonlyArray<CaaSMessagingEntityComponent>;
  withEntities: (
    entities: CaaSMessagingEntityComponent[],
  ) => CaaSBrokerComponent;
};

export type CaaSBrokerBuilder = {
  withId: (id: string) => CaaSBrokerBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSBrokerBuilder;
  withDisplayName: (displayName: string) => CaaSBrokerBuilder;
  withDescription: (description: string) => CaaSBrokerBuilder;
  build: () => BlueprintComponent;
};

export type CaaSBrokerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeCaaSBrokerComponent(
  broker: BlueprintComponent,
  entityNodes: CaaSMessagingEntityComponent[],
): CaaSBrokerComponent {
  const brokerDep: BlueprintComponentDependency = {id: broker.id};
  const wiredEntities = entityNodes.map(e => ({
    ...e,
    component: {
      ...e.component,
      dependencies: [...e.component.dependencies, brokerDep],
    },
  }));
  return {
    broker,
    entities: wiredEntities,
    withEntities: newEntities => makeCaaSBrokerComponent(broker, newEntities),
  };
}

export namespace CaaSBroker {
  export const getBuilder = (): CaaSBrokerBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildCaaSBrokerType())
      .withParameters(getParametersInstance());

    const builder: CaaSBrokerBuilder = {
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

  export const create = (config: CaaSBrokerConfig): CaaSBrokerComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeCaaSBrokerComponent(b.build(), []);
  };
}
