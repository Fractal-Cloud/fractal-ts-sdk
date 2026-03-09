import {describe, expect, it} from 'vitest';
import {AwsSecurityGroup} from './security_group';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-sg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My SG',
  description: 'Allow HTTP',
};

describe('AwsSecurityGroup', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsSecurityGroup.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AwsSecurityGroup');
    });

    it('should set provider to AWS', () => {
      const c = AwsSecurityGroup.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set description on component and as a parameter', () => {
      const c = AwsSecurityGroup.create(BASE_CONFIG);
      expect(c.description).toBe('Allow HTTP');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow HTTP'
      );
    });

    it('should set ingressRules when provided', () => {
      const rules = [{fromPort: 80, toPort: 80, protocol: 'tcp', sourceCidr: '0.0.0.0/0'}];
      const c = AwsSecurityGroup.create({...BASE_CONFIG, ingressRules: rules});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toEqual(
        rules
      );
    });

    it('should not set ingressRules when empty array', () => {
      const c = AwsSecurityGroup.create({...BASE_CONFIG, ingressRules: []});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toBeNull();
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

      const c = AwsSecurityGroup.satisfy(blueprint).build();
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
      const c = AwsSecurityGroup.satisfy(blueprint).build();
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

      const c = AwsSecurityGroup.satisfy(blueprint).build();
      expect(c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)).toEqual(
        rules
      );
    });

    it('should not set ingressRules when blueprint has none', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-norules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SG No Rules',
        description: 'No rules',
      });

      const c = AwsSecurityGroup.satisfy(blueprint).build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });
  });
});
