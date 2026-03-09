import {describe, expect, it} from 'vitest';
import {SecurityGroup, DESCRIPTION_PARAM, INGRESS_RULES_PARAM} from './security_group';

const BASE_CONFIG = {
  id: 'my-sg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My SG',
  description: 'Allow HTTP traffic',
};

describe('SecurityGroup (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = SecurityGroup.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.SecurityGroup');
    });

    it('should set id, version, and displayName', () => {
      const c = SecurityGroup.create(BASE_CONFIG);
      expect(c.id.toString()).toBe('my-sg');
      expect(c.version.major).toBe(1);
      expect(c.displayName).toBe('My SG');
    });

    it('should set description on the component and as a parameter', () => {
      const c = SecurityGroup.create(BASE_CONFIG);
      expect(c.description).toBe('Allow HTTP traffic');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow HTTP traffic'
      );
    });

    it('should set ingressRules parameter when provided', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 443, toPort: 443, sourceCidr: '0.0.0.0/0'},
      ];
      const c = SecurityGroup.create({...BASE_CONFIG, ingressRules: rules});
      expect(c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)).toEqual(
        rules
      );
    });

    it('should not set ingressRules when omitted', () => {
      const c = SecurityGroup.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component with description param set', () => {
      const c = SecurityGroup.getBuilder()
        .withId('sg-a')
        .withVersion(1, 0, 0)
        .withDisplayName('SG A')
        .withDescription('Allow HTTPS')
        .build();

      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.SecurityGroup');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow HTTPS'
      );
    });
  });
});
