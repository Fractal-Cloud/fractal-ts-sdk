import {describe, expect, it} from 'vitest';
import {ArubaVpnTunnel} from './aruba_vpn_tunnel';

const BASE_CONFIG = {
  id: 'my-tunnel',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VPN Tunnel',
};

describe('ArubaVpnTunnel', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaVpnTunnel.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaVpnTunnel');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaVpnTunnel.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set all tunnel parameters when provided', () => {
      const c = ArubaVpnTunnel.create({
        ...BASE_CONFIG,
        peerPublicIp: '203.0.113.1',
        presharedKey: 'secret-key',
        subnetCidr: '10.99.0.0/16',
      });
      expect(c.parameters.getOptionalFieldByName('peerPublicIp')).toBe(
        '203.0.113.1',
      );
      expect(c.parameters.getOptionalFieldByName('presharedKey')).toBe(
        'secret-key',
      );
      expect(c.parameters.getOptionalFieldByName('subnetCidr')).toBe(
        '10.99.0.0/16',
      );
    });
  });
});
