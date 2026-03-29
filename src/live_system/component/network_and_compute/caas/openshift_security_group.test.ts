import {describe, expect, it} from 'vitest';
import {OpenshiftSecurityGroup} from './openshift_security_group';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-netpol',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Network Policy',
  name: 'allow-web',
};

describe('OpenshiftSecurityGroup', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OpenshiftSecurityGroup.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.CaaS.OpenshiftSecurityGroup'
      );
    });

    it('should set provider to RedHat', () => {
      const c = OpenshiftSecurityGroup.create(BASE_CONFIG);
      expect(c.provider).toBe('RedHat');
    });

    it('should set required name parameter', () => {
      const c = OpenshiftSecurityGroup.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('name')).toBe('allow-web');
    });

    it('should set optional parameters when provided', () => {
      const c = OpenshiftSecurityGroup.create({
        ...BASE_CONFIG,
        description: 'Allow web traffic',
        policyType: 'Ingress',
        podSelector: '{"app":"web"}',
        egressRules: '[{"to":[{"cidr":"10.0.0.0/8"}]}]',
      });
      expect(c.description).toBe('Allow web traffic');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow web traffic'
      );
      expect(c.parameters.getOptionalFieldByName('policyType')).toBe(
        'Ingress'
      );
      expect(c.parameters.getOptionalFieldByName('podSelector')).toBe(
        '{"app":"web"}'
      );
      expect(c.parameters.getOptionalFieldByName('egressRules')).toBe(
        '[{"to":[{"cidr":"10.0.0.0/8"}]}]'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OpenshiftSecurityGroup.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('policyType')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('podSelector')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('egressRules')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy description from blueprint parameter', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SG',
        description: 'Blueprint description',
      });

      const c = OpenshiftSecurityGroup.satisfy(blueprint)
        .withName('policy')
        .build();
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Blueprint description'
      );
    });

    it('should fall back to component description when param is absent', () => {
      const blueprint = SecurityGroup.getBuilder()
        .withId('bp-sg-b')
        .withVersion(1, 0, 0)
        .withDisplayName('BP SG B')
        .build();
      const c = OpenshiftSecurityGroup.satisfy(blueprint)
        .withName('policy')
        .build();
      expect(c.description).toBeFalsy();
    });

    it('should auto-carry ingressRules from blueprint parameters', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
        {protocol: 'tcp', fromPort: 80, toPort: 80, sourceCidr: '0.0.0.0/0'},
      ];
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-rules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SG Rules',
        description: 'With rules',
        ingressRules: rules,
      });

      const c = OpenshiftSecurityGroup.satisfy(blueprint)
        .withName('policy')
        .build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toEqual(rules);
    });

    it('should not set ingressRules when blueprint has none', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-norules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SG No Rules',
        description: 'No rules',
      });

      const c = OpenshiftSecurityGroup.satisfy(blueprint)
        .withName('policy')
        .build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SG Vendor',
      });

      const c = OpenshiftSecurityGroup.satisfy(blueprint)
        .withName('deny-all')
        .withPolicyType('Both')
        .withPodSelector('{"role":"db"}')
        .withEgressRules('[{"to":[]}]')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe('deny-all');
      expect(c.parameters.getOptionalFieldByName('policyType')).toBe('Both');
      expect(c.parameters.getOptionalFieldByName('podSelector')).toBe(
        '{"role":"db"}'
      );
      expect(c.parameters.getOptionalFieldByName('egressRules')).toBe(
        '[{"to":[]}]'
      );
    });
  });
});
