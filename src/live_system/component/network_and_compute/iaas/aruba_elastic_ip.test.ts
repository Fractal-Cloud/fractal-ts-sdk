import {describe, expect, it} from 'vitest';
import {ArubaElasticIp} from './aruba_elastic_ip';

const BASE_CONFIG = {
  id: 'my-eip',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Elastic IP',
};

describe('ArubaElasticIp', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaElasticIp.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaElasticIp');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaElasticIp.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should carry description when provided', () => {
      const c = ArubaElasticIp.create({
        ...BASE_CONFIG,
        description: 'public ingress IP',
      });
      expect(c.description).toBe('public ingress IP');
    });
  });
});
