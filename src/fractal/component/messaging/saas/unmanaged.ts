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

export const MESSAGING_UNMANAGED_TYPE_NAME = 'Unmanaged';

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

function buildMessagingUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(MESSAGING_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type MessagingUnmanagedComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type MessagingUnmanagedBuilder = {
  withId: (id: string) => MessagingUnmanagedBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => MessagingUnmanagedBuilder;
  withDisplayName: (displayName: string) => MessagingUnmanagedBuilder;
  withDescription: (description: string) => MessagingUnmanagedBuilder;
  build: () => BlueprintComponent;
};

export type MessagingUnmanagedConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeMessagingUnmanagedComponent(
  component: BlueprintComponent,
): MessagingUnmanagedComponent {
  return {component, components: [component]};
}

export namespace MessagingUnmanaged {
  export const getBuilder = (): MessagingUnmanagedBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildMessagingUnmanagedType())
      .withParameters(getParametersInstance());

    const builder: MessagingUnmanagedBuilder = {
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
    config: MessagingUnmanagedConfig,
  ): MessagingUnmanagedComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeMessagingUnmanagedComponent(b.build());
  };
}
