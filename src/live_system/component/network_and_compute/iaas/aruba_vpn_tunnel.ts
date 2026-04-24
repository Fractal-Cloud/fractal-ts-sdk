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

// Matches aria-agent-aruba handlers/vpn_tunnel.go: NetworkAndCompute.IaaS.ArubaVpnTunnel
const ARUBA_VPN_TUNNEL_TYPE_NAME = 'ArubaVpnTunnel';
const PEER_PUBLIC_IP_PARAM = 'peerPublicIp';
const PRESHARED_KEY_PARAM = 'presharedKey';
const SUBNET_CIDR_PARAM = 'subnetCidr';

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
        .withValue(ARUBA_VPN_TUNNEL_TYPE_NAME)
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

export type ArubaVpnTunnelBuilder = {
  withId: (id: string) => ArubaVpnTunnelBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaVpnTunnelBuilder;
  withDisplayName: (displayName: string) => ArubaVpnTunnelBuilder;
  withDescription: (description: string) => ArubaVpnTunnelBuilder;
  withPeerPublicIp: (ip: string) => ArubaVpnTunnelBuilder;
  withPresharedKey: (key: string) => ArubaVpnTunnelBuilder;
  withSubnetCidr: (cidr: string) => ArubaVpnTunnelBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaVpnTunnelConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  peerPublicIp?: string;
  presharedKey?: string;
  subnetCidr?: string;
};

export namespace ArubaVpnTunnel {
  export const getBuilder = (): ArubaVpnTunnelBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaVpnTunnelBuilder = {
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
      withPeerPublicIp: value => {
        pushParam(params, PEER_PUBLIC_IP_PARAM, value);
        return builder;
      },
      withPresharedKey: value => {
        pushParam(params, PRESHARED_KEY_PARAM, value);
        return builder;
      },
      withSubnetCidr: value => {
        pushParam(params, SUBNET_CIDR_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: ArubaVpnTunnelConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.peerPublicIp) {
      b.withPeerPublicIp(config.peerPublicIp);
    }
    if (config.presharedKey) {
      b.withPresharedKey(config.presharedKey);
    }
    if (config.subnetCidr) {
      b.withSubnetCidr(config.subnetCidr);
    }

    return b.build();
  };
}
