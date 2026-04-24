import {describe, expect, it} from 'vitest';
import {ArubaVpcPeering} from './aruba_vpc_peering';

const BASE_CONFIG = {
  id: 'my-peering',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Peering',
  peerVpcId: 'vpc-abc123',
};

describe('ArubaVpcPeering', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaVpcPeering.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaVpcPeering');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaVpcPeering.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set peerVpcId parameter', () => {
      const c = ArubaVpcPeering.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('peerVpcId')).toBe(
        'vpc-abc123',
      );
    });
  });
});
