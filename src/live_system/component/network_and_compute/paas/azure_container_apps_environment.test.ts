import {describe, expect, it} from 'vitest';
import {AzureContainerAppsEnvironment} from './azure_container_apps_environment';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';

const BASE_CONFIG = {
  id: 'my-env',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Environment',
  location: 'eastus',
  resourceGroup: 'my-rg',
};

describe('AzureContainerAppsEnvironment', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureContainerAppsEnvironment.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerAppsEnvironment',
      );
    });

    it('should set provider to Azure', () => {
      const c = AzureContainerAppsEnvironment.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id, displayName, and required params', () => {
      const c = AzureContainerAppsEnvironment.create({
        ...BASE_CONFIG,
        description: 'My env',
      });
      expect(c.id.toString()).toBe('my-env');
      expect(c.displayName).toBe('My Environment');
      expect(c.description).toBe('My env');
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional params when provided', () => {
      const c = AzureContainerAppsEnvironment.create({
        ...BASE_CONFIG,
        logAnalyticsWorkspaceId: 'workspace-id',
        logAnalyticsSharedKey: 'shared-key',
      });
      expect(
        c.parameters.getOptionalFieldByName('logAnalyticsWorkspaceId'),
      ).toBe('workspace-id');
      expect(
        c.parameters.getOptionalFieldByName('logAnalyticsSharedKey'),
      ).toBe('shared-key');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint', () => {
      const platform = ContainerPlatform.create({
        id: 'bp-env',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Env',
        description: 'A container platform',
      });

      const c = AzureContainerAppsEnvironment.satisfy(platform.platform)
        .withLocation('westus')
        .withResourceGroup('bp-rg')
        .build();
      expect(c.id.toString()).toBe('bp-env');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.displayName).toBe('Blueprint Env');
      expect(c.description).toBe('A container platform');
    });

    it('should set the correct type string', () => {
      const platform = ContainerPlatform.create({
        id: 'test-env',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Env',
      });
      const c = AzureContainerAppsEnvironment.satisfy(platform.platform)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerAppsEnvironment',
      );
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const platform = ContainerPlatform.create({
        id: 'test-env',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Env',
      });

      const c = AzureContainerAppsEnvironment.satisfy(platform.platform)
        .withLocation('eastus')
        .withResourceGroup('my-rg')
        .withLogAnalyticsWorkspaceId('workspace-id')
        .withLogAnalyticsSharedKey('shared-key')
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
      expect(
        c.parameters.getOptionalFieldByName('logAnalyticsWorkspaceId'),
      ).toBe('workspace-id');
      expect(
        c.parameters.getOptionalFieldByName('logAnalyticsSharedKey'),
      ).toBe('shared-key');
    });
  });

  describe('getBuilder()', () => {
    it('should build an environment via fluent builder', () => {
      const c = AzureContainerAppsEnvironment.getBuilder()
        .withId('env-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Env B')
        .withLocation('westeurope')
        .withResourceGroup('rg-b')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerAppsEnvironment',
      );
      expect(c.id.toString()).toBe('env-b');
      expect(c.version.major).toBe(2);
    });
  });
});
