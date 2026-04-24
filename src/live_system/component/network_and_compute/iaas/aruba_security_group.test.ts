import {describe, expect, it} from 'vitest';
import {ArubaSecurityGroup} from './aruba_security_group';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-sg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Aruba SG',
};

describe('ArubaSecurityGroup', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaSecurityGroup.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.IaaS.ArubaSecurityGroup',
      );
    });

    it('should set provider to Aruba', () => {
      const c = ArubaSecurityGroup.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set description on component and as a parameter', () => {
      const c = ArubaSecurityGroup.create({
        ...BASE_CONFIG,
        description: 'allow http',
      });
      expect(c.description).toBe('allow http');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'allow http',
      );
    });

    it('should set name and ingressRules when provided', () => {
      const rules = [
        {fromPort: 80, toPort: 80, protocol: 'tcp', sourceCidr: '0.0.0.0/0'},
      ];
      const c = ArubaSecurityGroup.create({
        ...BASE_CONFIG,
        name: 'fractal-mgd-my-sg',
        ingressRules: rules,
      });
      expect(c.parameters.getOptionalFieldByName('name')).toBe(
        'fractal-mgd-my-sg',
      );
      expect(c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)).toEqual(
        rules,
      );
    });
  });

  describe('satisfy()', () => {
    it('should carry description and ingressRules from blueprint', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
      ];
      const blueprint = SecurityGroup.create({
        id: 'bp-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint SG',
        description: 'ssh',
        ingressRules: rules,
      });

      const c = ArubaSecurityGroup.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-sg');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'ssh',
      );
      expect(c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)).toEqual(
        rules,
      );
    });

    it('should allow setting vendor name on the sealed builder', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint SG',
        description: 'sg',
      });

      const c = ArubaSecurityGroup.satisfy(blueprint)
        .withName('fractal-mgd-bp-sg')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe(
        'fractal-mgd-bp-sg',
      );
    });
  });
});
