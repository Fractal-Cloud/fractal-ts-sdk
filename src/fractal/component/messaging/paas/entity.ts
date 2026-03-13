import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';

export const MESSAGING_ENTITY_TYPE_NAME = 'Entity';
export const MESSAGE_RETENTION_HOURS_PARAM = 'messageRetentionHours';

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

function buildMessagingEntityType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(MESSAGING_ENTITY_TYPE_NAME)
        .build(),
    )
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// ── Public API ────────────────────────────────────────────────────────────────

export type MessagingEntityComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type MessagingEntityBuilder = {
  withId: (id: string) => MessagingEntityBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => MessagingEntityBuilder;
  withDisplayName: (displayName: string) => MessagingEntityBuilder;
  withDescription: (description: string) => MessagingEntityBuilder;
  withMessageRetentionHours: (hours: number) => MessagingEntityBuilder;
  build: () => BlueprintComponent;
};

export type MessagingEntityConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  messageRetentionHours?: number;
};

function makeMessagingEntityComponent(
  component: BlueprintComponent,
): MessagingEntityComponent {
  return {component, components: [component]};
}

export namespace MessagingEntity {
  export const getBuilder = (): MessagingEntityBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildMessagingEntityType())
      .withParameters(params);

    const builder: MessagingEntityBuilder = {
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
      withMessageRetentionHours: hours => {
        pushParam(params, MESSAGE_RETENTION_HOURS_PARAM, hours);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: MessagingEntityConfig,
  ): MessagingEntityComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.messageRetentionHours !== undefined)
      b.withMessageRetentionHours(config.messageRetentionHours);

    return makeMessagingEntityComponent(b.build());
  };
}
