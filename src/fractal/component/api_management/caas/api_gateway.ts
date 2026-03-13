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

export const CAAS_API_GATEWAY_TYPE_NAME = 'APIGateway';

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

function buildCaaSApiGatewayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_API_GATEWAY_TYPE_NAME)
        .build(),
    )
    .build();
}

// -- Public API ----------------------------------------------------------------

export type CaaSApiGatewayComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type CaaSApiGatewayBuilder = {
  withId: (id: string) => CaaSApiGatewayBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSApiGatewayBuilder;
  withDisplayName: (displayName: string) => CaaSApiGatewayBuilder;
  withDescription: (description: string) => CaaSApiGatewayBuilder;
  build: () => BlueprintComponent;
};

export type CaaSApiGatewayConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeCaaSApiGatewayComponent(
  component: BlueprintComponent,
): CaaSApiGatewayComponent {
  return {component, components: [component]};
}

export namespace CaaSApiGateway {
  export const getBuilder = (): CaaSApiGatewayBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildCaaSApiGatewayType())
      .withParameters(getParametersInstance());

    const builder: CaaSApiGatewayBuilder = {
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
    config: CaaSApiGatewayConfig,
  ): CaaSApiGatewayComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeCaaSApiGatewayComponent(b.build());
  };
}
