import {describe, expect, it} from 'vitest';
import {AzureNsg} from './azure_nsg';
import {
  SecurityGroup,
  DESCRIPTION_PARAM,
  INGRESS_RULES_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-nsg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My NSG',
  description: 'Allow HTTP',
  location: 'eastus',
  resourceGroup: 'my-rg',
};

describe('AzureNsg', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureNsg.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AzureNsg');
    });

    it('should set provider to Azure', () => {
      const c = AzureNsg.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set description on component and as a parameter', () => {
      const c = AzureNsg.create(BASE_CONFIG);
      expect(c.description).toBe('Allow HTTP');
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Allow HTTP'
      );
    });

    it('should set location and resourceGroup parameters', () => {
      const c = AzureNsg.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg'
      );
    });

    it('should set ingressRules when provided', () => {
      const rules = [
        {fromPort: 80, toPort: 80, protocol: 'tcp', sourceCidr: '0.0.0.0/0'},
      ];
      const c = AzureNsg.create({...BASE_CONFIG, ingressRules: rules});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toEqual(
        rules
      );
    });

    it('should not set ingressRules when empty array', () => {
      const c = AzureNsg.create({...BASE_CONFIG, ingressRules: []});
      expect(c.parameters.getOptionalFieldByName('ingressRules')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy description from blueprint parameter', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-nsg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP NSG',
        description: 'Blueprint description',
      });

      const c = AzureNsg.satisfy(blueprint)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(c.parameters.getOptionalFieldByName(DESCRIPTION_PARAM)).toBe(
        'Blueprint description'
      );
    });

    it('should fall back to component description when param is absent', () => {
      const blueprint = SecurityGroup.getBuilder()
        .withId('bp-nsg-b')
        .withVersion(1, 0, 0)
        .withDisplayName('BP NSG B')
        .build();
      const c = AzureNsg.satisfy(blueprint).build();
      expect(c.description).toBeFalsy();
    });

    it('should auto-carry ingressRules from blueprint parameters', () => {
      const rules = [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
        {protocol: 'tcp', fromPort: 80, toPort: 80, sourceCidr: '0.0.0.0/0'},
      ];
      const blueprint = SecurityGroup.create({
        id: 'bp-nsg-rules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP NSG Rules',
        description: 'With rules',
        ingressRules: rules,
      });

      const c = AzureNsg.satisfy(blueprint)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toEqual(rules);
    });

    it('should not set ingressRules when blueprint has none', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-nsg-norules',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP NSG No Rules',
        description: 'No rules',
      });

      const c = AzureNsg.satisfy(blueprint).build();
      expect(
        c.parameters.getOptionalFieldByName(INGRESS_RULES_PARAM)
      ).toBeNull();
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-nsg-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP NSG Vendor',
        description: 'Vendor test',
      });

      const c = AzureNsg.satisfy(blueprint)
        .withLocation('westeurope')
        .withResourceGroup('prod-rg')
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'westeurope'
      );
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'prod-rg'
      );
    });
  });
});
