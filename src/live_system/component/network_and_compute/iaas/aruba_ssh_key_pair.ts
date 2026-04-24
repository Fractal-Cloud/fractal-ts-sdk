import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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

// Matches aria-agent-aruba handlers/ssh_key_pair.go: NetworkAndCompute.IaaS.ArubaSshKeyPair
const ARUBA_SSH_KEY_PAIR_TYPE_NAME = 'ArubaSshKeyPair';
const KEY_NAME_PARAM = 'keyName';
const PUBLIC_KEY_PARAM = 'publicKey';

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

function buildType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_SSH_KEY_PAIR_TYPE_NAME)
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

export type ArubaSshKeyPairBuilder = {
  withId: (id: string) => ArubaSshKeyPairBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaSshKeyPairBuilder;
  withDisplayName: (displayName: string) => ArubaSshKeyPairBuilder;
  withDescription: (description: string) => ArubaSshKeyPairBuilder;
  withKeyName: (keyName: string) => ArubaSshKeyPairBuilder;
  withPublicKey: (publicKey: string) => ArubaSshKeyPairBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaSshKeyPairConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  keyName?: string;
  publicKey: string;
};

export namespace ArubaSshKeyPair {
  export const getBuilder = (): ArubaSshKeyPairBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaSshKeyPairBuilder = {
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
      withKeyName: keyName => {
        pushParam(params, KEY_NAME_PARAM, keyName);
        return builder;
      },
      withPublicKey: publicKey => {
        pushParam(params, PUBLIC_KEY_PARAM, publicKey);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: ArubaSshKeyPairConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withPublicKey(config.publicKey);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.keyName) {
      b.withKeyName(config.keyName);
    }

    return b.build();
  };
}
