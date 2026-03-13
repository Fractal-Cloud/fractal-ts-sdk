import {describe, expect, it} from 'vitest';
import {OciSecurityList} from './oci_security_list';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-sl',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Security List',
  compartmentId: 'ocid1.compartment.oc1..aaaaaa',
};

describe('OciSecurityList', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OciSecurityList.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.OciSecurityList');
    });

    it('should set provider to OCI', () => {
      const c = OciSecurityList.create(BASE_CONFIG);
      expect(c.provider).toBe('OCI');
    });

    it('should set compartmentId parameter', () => {
      const c = OciSecurityList.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..aaaaaa'
      );
    });

    it('should set description on component and as a parameter', () => {
      const c = OciSecurityList.create({
        ...BASE_CONFIG,
        description: 'Allow SSH',
      });
      expect(c.description).toBe('Allow SSH');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow SSH'
      );
    });

    it('should set ingressRules when provided', () => {
      const rules = [
        {fromPort: 80, toPort: 80, protocol: 'tcp', sourceCidr: '0.0.0.0/0'},
      ];
      const c = OciSecurityList.create({...BASE_CONFIG, ingressRules: rules});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toEqual(
        rules
      );
    });

    it('should not set ingressRules when empty array', () => {
      const c = OciSecurityList.create({...BASE_CONFIG, ingressRules: []});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy description from blueprint parameter', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sl',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SL',
        description: 'Blueprint description',
      });

      const c = OciSecurityList.satisfy(blueprint)
        .withCompartmentId('ocid1.compartment.oc1..bbbbbb')
        .build();
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Blueprint description'
      );
    });

    it('should fall back to component description when param is absent', () => {
      const blueprint = SecurityGroup.getBuilder()
        .withId('bp-sl-b')
        .withVersion(1, 0, 0)
        .withDisplayName('BP SL B')
        .build();
      const c = OciSecurityList.satisfy(blueprint).build();
      expect(c.description).toBeFalsy();
    });

    it('should auto-carry ingressRules from blueprint parameters', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
        {protocol: 'tcp', fromPort: 80, toPort: 80, sourceCidr: '0.0.0.0/0'},
      ];
      const blueprint = SecurityGroup.create({
        id: 'bp-sl-rules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SL Rules',
        description: 'With rules',
        ingressRules: rules,
      });

      const c = OciSecurityList.satisfy(blueprint)
        .withCompartmentId('ocid1.compartment.oc1..cccccc')
        .build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toEqual(rules);
    });

    it('should not set ingressRules when blueprint has none', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sl-norules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SL No Rules',
        description: 'No rules',
      });

      const c = OciSecurityList.satisfy(blueprint).build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });

    it('should allow setting compartmentId after satisfy', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sl-comp',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP SL Comp',
        description: 'With compartment',
      });

      const c = OciSecurityList.satisfy(blueprint)
        .withCompartmentId('ocid1.compartment.oc1..dddddd')
        .build();
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..dddddd'
      );
    });
  });
});
