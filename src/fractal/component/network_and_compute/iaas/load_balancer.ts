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
import {ComponentLink} from '../../../../component/link';

export const LOAD_BALANCER_TYPE_NAME = 'LoadBalancer';

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

function buildLoadBalancerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(LOAD_BALANCER_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type LoadBalancerComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

function makeLoadBalancerComponent(
  component: BlueprintComponent,
): LoadBalancerComponent {
  return {
    component,
    components: [component],
  };
}

export type LoadBalancerBuilder = {
  withId: (id: string) => LoadBalancerBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => LoadBalancerBuilder;
  withDisplayName: (displayName: string) => LoadBalancerBuilder;
  withDescription: (description: string) => LoadBalancerBuilder;
  withLinks: (links: ComponentLink[]) => LoadBalancerBuilder;
  build: () => BlueprintComponent;
};

export type LoadBalancerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace LoadBalancer {
  export const getBuilder = (): LoadBalancerBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildLoadBalancerType())
      .withParameters(getParametersInstance());

    const builder: LoadBalancerBuilder = {
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
      withLinks: links => {
        inner.withLinks(links);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: LoadBalancerConfig): LoadBalancerComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeLoadBalancerComponent(b.build());
  };
}
