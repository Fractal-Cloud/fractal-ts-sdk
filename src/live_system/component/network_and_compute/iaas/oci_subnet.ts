import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
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
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';
import {CIDR_BLOCK_PARAM} from '../../../../fractal/component/network_and_compute/iaas/subnet';

// Agent constant: OCI_SUBNET_COMPONENT_NAME = "OciSubnet"
const OCI_SUBNET_TYPE_NAME = 'OciSubnet';
const COMPARTMENT_ID_PARAM = 'compartmentId';
const AVAILABILITY_DOMAIN_PARAM = 'availabilityDomain';
const PROHIBIT_PUBLIC_IP_PARAM = 'prohibitPublicIpOnVnic';

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

function buildOciSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OCI_SUBNET_TYPE_NAME).build(),
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

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description, cidrBlock,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedOciSubnetBuilder = {
  withCompartmentId: (id: string) => SatisfiedOciSubnetBuilder;
  withAvailabilityDomain: (ad: string) => SatisfiedOciSubnetBuilder;
  withProhibitPublicIpOnVnic: (prohibit: boolean) => SatisfiedOciSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type OciSubnetBuilder = {
  withId: (id: string) => OciSubnetBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OciSubnetBuilder;
  withDisplayName: (displayName: string) => OciSubnetBuilder;
  withDescription: (description: string) => OciSubnetBuilder;
  withCidrBlock: (cidrBlock: string) => OciSubnetBuilder;
  withCompartmentId: (id: string) => OciSubnetBuilder;
  withAvailabilityDomain: (ad: string) => OciSubnetBuilder;
  withProhibitPublicIpOnVnic: (prohibit: boolean) => OciSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type OciSubnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  compartmentId: string;
  availabilityDomain?: string;
  prohibitPublicIpOnVnic?: boolean;
};

export namespace OciSubnet {
  export const getBuilder = (): OciSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciSubnetType())
      .withParameters(params)
      .withProvider('OCI');

    const builder: OciSubnetBuilder = {
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
      withCidrBlock: value => {
        pushParam(params, CIDR_BLOCK_PARAM, value);
        return builder;
      },
      withCompartmentId: value => {
        pushParam(params, COMPARTMENT_ID_PARAM, value);
        return builder;
      },
      withAvailabilityDomain: value => {
        pushParam(params, AVAILABILITY_DOMAIN_PARAM, value);
        return builder;
      },
      withProhibitPublicIpOnVnic: value => {
        pushParam(params, PROHIBIT_PUBLIC_IP_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOciSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciSubnetType())
      .withParameters(params)
      .withProvider('OCI')
      .withId(buildId(blueprint.id.toString()))
      .withVersion(
        buildVersion(
          blueprint.version.major,
          blueprint.version.minor,
          blueprint.version.patch,
        ),
      )
      .withDisplayName(blueprint.displayName)
      .withDependencies(blueprint.dependencies)
      .withLinks(blueprint.links);

    if (blueprint.description) inner.withDescription(blueprint.description);

    const cidrBlock =
      blueprint.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM);
    if (cidrBlock !== null)
      pushParam(params, CIDR_BLOCK_PARAM, String(cidrBlock));

    const satisfiedBuilder: SatisfiedOciSubnetBuilder = {
      withCompartmentId: value => {
        pushParam(params, COMPARTMENT_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withAvailabilityDomain: value => {
        pushParam(params, AVAILABILITY_DOMAIN_PARAM, value);
        return satisfiedBuilder;
      },
      withProhibitPublicIpOnVnic: value => {
        pushParam(params, PROHIBIT_PUBLIC_IP_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: OciSubnetConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock)
      .withCompartmentId(config.compartmentId);

    if (config.description) b.withDescription(config.description);
    if (config.availabilityDomain)
      b.withAvailabilityDomain(config.availabilityDomain);
    if (config.prohibitPublicIpOnVnic !== undefined)
      b.withProhibitPublicIpOnVnic(config.prohibitPublicIpOnVnic);

    return b.build();
  };
}
