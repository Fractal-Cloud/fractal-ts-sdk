import {describe, expect, it} from 'vitest';
import {GcpFirewall} from './gcp_firewall';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-gcp-firewall',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My GCP Firewall',
  description: 'Allow HTTP',
};

describe('GcpFirewall', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpFirewall.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.SecurityGroup');
    });

    it('should set provider to GCP', () => {
      const c = GcpFirewall.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set description on component and as a parameter', () => {
      const c = GcpFirewall.create(BASE_CONFIG);
      expect(c.description).toBe('Allow HTTP');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow HTTP'
      );
    });

    it('should set ingressRules when provided', () => {
      const rules = [
        {fromPort: 80, toPort: 80, protocol: 'tcp', sourceCidr: '0.0.0.0/0'},
      ];
      const c = GcpFirewall.create({...BASE_CONFIG, ingressRules: rules});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toEqual(
        rules
      );
    });

    it('should not set ingressRules when empty array', () => {
      const c = GcpFirewall.create({...BASE_CONFIG, ingressRules: []});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy description from blueprint parameter', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-fw',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Firewall',
        description: 'Blueprint description',
      });

      const c = GcpFirewall.satisfy(blueprint).build();
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Blueprint description'
      );
    });

    it('should fall back to component description when param is absent', () => {
      const blueprint = SecurityGroup.getBuilder()
        .withId('bp-fw-b')
        .withVersion(1, 0, 0)
        .withDisplayName('BP Firewall B')
        .build();
      const c = GcpFirewall.satisfy(blueprint).build();
      expect(c.description).toBeFalsy();
    });

    it('should auto-carry ingressRules from blueprint parameters', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
        {protocol: 'tcp', fromPort: 80, toPort: 80, sourceCidr: '0.0.0.0/0'},
      ];
      const blueprint = SecurityGroup.create({
        id: 'bp-fw-rules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Firewall Rules',
        description: 'With rules',
        ingressRules: rules,
      });

      const c = GcpFirewall.satisfy(blueprint).build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toEqual(rules);
    });

    it('should not set ingressRules when blueprint has none', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-fw-norules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Firewall No Rules',
        description: 'No rules',
      });

      const c = GcpFirewall.satisfy(blueprint).build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });
  });
});
