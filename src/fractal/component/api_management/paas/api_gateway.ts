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

export const PAAS_API_GATEWAY_TYPE_NAME = 'APIGateway';

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

function buildPaaSApiGatewayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(PAAS_API_GATEWAY_TYPE_NAME)
        .build(),
    )
    .build();
}

// -- Public API ----------------------------------------------------------------

export type PaaSApiGatewayComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type PaaSApiGatewayBuilder = {
  withId: (id: string) => PaaSApiGatewayBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => PaaSApiGatewayBuilder;
  withDisplayName: (displayName: string) => PaaSApiGatewayBuilder;
  withDescription: (description: string) => PaaSApiGatewayBuilder;
  build: () => BlueprintComponent;
};

export type PaaSApiGatewayConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makePaaSApiGatewayComponent(
  component: BlueprintComponent,
): PaaSApiGatewayComponent {
  return {component, components: [component]};
}

export namespace PaaSApiGateway {
  export const getBuilder = (): PaaSApiGatewayBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildPaaSApiGatewayType())
      .withParameters(getParametersInstance());

    const builder: PaaSApiGatewayBuilder = {
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
    config: PaaSApiGatewayConfig,
  ): PaaSApiGatewayComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makePaaSApiGatewayComponent(b.build());
  };
}
