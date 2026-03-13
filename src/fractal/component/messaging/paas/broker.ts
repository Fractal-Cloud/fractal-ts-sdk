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
import {MessagingEntityComponent} from './entity';

export const BROKER_TYPE_NAME = 'Broker';

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

function buildBrokerType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(BROKER_TYPE_NAME).build())
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BrokerComponent = {
  readonly broker: BlueprintComponent;
  readonly entities: ReadonlyArray<MessagingEntityComponent>;
  withEntities: (entities: MessagingEntityComponent[]) => BrokerComponent;
};

export type BrokerBuilder = {
  withId: (id: string) => BrokerBuilder;
  withVersion: (major: number, minor: number, patch: number) => BrokerBuilder;
  withDisplayName: (displayName: string) => BrokerBuilder;
  withDescription: (description: string) => BrokerBuilder;
  build: () => BlueprintComponent;
};

export type BrokerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeBrokerComponent(
  broker: BlueprintComponent,
  entityNodes: MessagingEntityComponent[],
): BrokerComponent {
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
    withEntities: newEntities => makeBrokerComponent(broker, newEntities),
  };
}

export namespace Broker {
  export const getBuilder = (): BrokerBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildBrokerType())
      .withParameters(getParametersInstance());

    const builder: BrokerBuilder = {
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

  export const create = (config: BrokerConfig): BrokerComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeBrokerComponent(b.build(), []);
  };
}
