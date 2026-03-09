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

// Agent constant: EC2_COMPONENT_NAME = "EC2"
const EC2_TYPE_NAME = 'EC2';
const AMI_ID_PARAM = 'amiId';
const INSTANCE_TYPE_PARAM = 'instanceType';
const KEY_NAME_PARAM = 'keyName';
const USER_DATA_PARAM = 'userData';
const IAM_INSTANCE_PROFILE_PARAM = 'iamInstanceProfile';
const ASSOCIATE_PUBLIC_IP_PARAM = 'associatePublicIp';

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

function buildEc2Type(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(EC2_TYPE_NAME).build())
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
 * Structural properties (id, version, displayName, description, dependencies,
 * links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedEc2Builder = {
  withAmiId: (amiId: string) => SatisfiedEc2Builder;
  withInstanceType: (instanceType: string) => SatisfiedEc2Builder;
  withKeyName: (keyName: string) => SatisfiedEc2Builder;
  withUserData: (userData: string) => SatisfiedEc2Builder;
  withIamInstanceProfile: (profile: string) => SatisfiedEc2Builder;
  withAssociatePublicIp: (associate: boolean) => SatisfiedEc2Builder;
  build: () => LiveSystemComponent;
};

export type Ec2InstanceBuilder = {
  withId: (id: string) => Ec2InstanceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => Ec2InstanceBuilder;
  withDisplayName: (displayName: string) => Ec2InstanceBuilder;
  withDescription: (description: string) => Ec2InstanceBuilder;
  withAmiId: (amiId: string) => Ec2InstanceBuilder;
  withInstanceType: (instanceType: string) => Ec2InstanceBuilder;
  withKeyName: (keyName: string) => Ec2InstanceBuilder;
  withUserData: (userData: string) => Ec2InstanceBuilder;
  withIamInstanceProfile: (profile: string) => Ec2InstanceBuilder;
  withAssociatePublicIp: (associate: boolean) => Ec2InstanceBuilder;
  build: () => LiveSystemComponent;
};

export type Ec2InstanceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  amiId: string;
  instanceType: string;
  keyName?: string;
  userData?: string;
  iamInstanceProfile?: string;
  associatePublicIp?: boolean;
};

export namespace Ec2Instance {
  export const getBuilder = (): Ec2InstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildEc2Type())
      .withParameters(params)
      .withProvider('AWS');

    const builder: Ec2InstanceBuilder = {
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
      withAmiId: value => {
        pushParam(params, AMI_ID_PARAM, value);
        return builder;
      },
      withInstanceType: value => {
        pushParam(params, INSTANCE_TYPE_PARAM, value);
        return builder;
      },
      withKeyName: value => {
        pushParam(params, KEY_NAME_PARAM, value);
        return builder;
      },
      withUserData: value => {
        pushParam(params, USER_DATA_PARAM, value);
        return builder;
      },
      withIamInstanceProfile: value => {
        pushParam(params, IAM_INSTANCE_PROFILE_PARAM, value);
        return builder;
      },
      withAssociatePublicIp: value => {
        pushParam(params, ASSOCIATE_PUBLIC_IP_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedEc2Builder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildEc2Type())
      .withParameters(params)
      .withProvider('AWS')
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

    const satisfiedBuilder: SatisfiedEc2Builder = {
      withAmiId: value => {
        pushParam(params, AMI_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withInstanceType: value => {
        pushParam(params, INSTANCE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withKeyName: value => {
        pushParam(params, KEY_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withUserData: value => {
        pushParam(params, USER_DATA_PARAM, value);
        return satisfiedBuilder;
      },
      withIamInstanceProfile: value => {
        pushParam(params, IAM_INSTANCE_PROFILE_PARAM, value);
        return satisfiedBuilder;
      },
      withAssociatePublicIp: value => {
        pushParam(params, ASSOCIATE_PUBLIC_IP_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: Ec2InstanceConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withAmiId(config.amiId)
      .withInstanceType(config.instanceType);

    if (config.description) b.withDescription(config.description);
    if (config.keyName) b.withKeyName(config.keyName);
    if (config.userData) b.withUserData(config.userData);
    if (config.iamInstanceProfile)
      b.withIamInstanceProfile(config.iamInstanceProfile);
    if (config.associatePublicIp !== undefined)
      b.withAssociatePublicIp(config.associatePublicIp);

    return b.build();
  };
}
