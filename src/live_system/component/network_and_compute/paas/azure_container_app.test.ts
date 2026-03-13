import {describe, expect, it} from 'vitest';
import {AzureContainerApp} from './azure_container_app';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';
import {
  CONTAINER_IMAGE_PARAM,
  CONTAINER_PORT_PARAM,
  CPU_PARAM,
  MEMORY_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-app',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My App',
  image: 'nginx:latest',
  location: 'eastus',
  resourceGroup: 'my-rg',
};

describe('AzureContainerApp', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureContainerApp.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerApp',
      );
    });

    it('should set provider to Azure', () => {
      const c = AzureContainerApp.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id, displayName, and required params', () => {
      const c = AzureContainerApp.create({
        ...BASE_CONFIG,
        description: 'My container app',
      });
      expect(c.id.toString()).toBe('my-app');
      expect(c.displayName).toBe('My App');
      expect(c.description).toBe('My container app');
      expect(c.parameters.getOptionalFieldByName('image')).toBe('nginx:latest');
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional params when provided', () => {
      const c = AzureContainerApp.create({
        ...BASE_CONFIG,
        port: 8080,
        cpu: 0.5,
        memory: '1Gi',
        externalIngress: true,
        minReplicas: 1,
        maxReplicas: 5,
      });
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe(0.5);
      expect(c.parameters.getOptionalFieldByName('memory')).toBe('1Gi');
      expect(c.parameters.getOptionalFieldByName('externalIngress')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('minReplicas')).toBe(1);
      expect(c.parameters.getOptionalFieldByName('maxReplicas')).toBe(5);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint workload', () => {
      const workload = Workload.create({
        id: 'bp-app',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'BP App',
        containerImage: 'nginx:latest',
      });

      const c = AzureContainerApp.satisfy(workload.component)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(c.id.toString()).toBe('bp-app');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('BP App');
    });

    it('should carry containerImage and containerPort from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-app',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP App',
        containerImage: 'myimage:v1',
        containerPort: 3000,
        cpu: 0.25,
        memory: '512Mi',
      });

      const c = AzureContainerApp.satisfy(workload.component)
        .withLocation('westus')
        .withResourceGroup('rg')
        .build();
      expect(c.parameters.getOptionalFieldByName('image')).toBe('myimage:v1');
      expect(c.parameters.getOptionalFieldByName('port')).toBe(3000);
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe(0.25);
      expect(c.parameters.getOptionalFieldByName('memory')).toBe('512Mi');
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const workload = Workload.create({
        id: 'bp-app',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP App',
        containerImage: 'nginx:latest',
      });

      const c = AzureContainerApp.satisfy(workload.component)
        .withLocation('eastus')
        .withResourceGroup('my-rg')
        .withExternalIngress(true)
        .withMinReplicas(1)
        .withMaxReplicas(10)
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
      expect(c.parameters.getOptionalFieldByName('externalIngress')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('minReplicas')).toBe(1);
      expect(c.parameters.getOptionalFieldByName('maxReplicas')).toBe(10);
    });

    it('should carry links from blueprint workload', () => {
      const apiWorkload = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const webWorkload = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web',
        containerImage: 'nginx:latest',
      }).linkToWorkload([{target: apiWorkload, fromPort: 8080}]);

      const c = AzureContainerApp.satisfy(webWorkload.component)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-workload');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080,
      );
    });
  });

  describe('getBuilder()', () => {
    it('should build an app via fluent builder', () => {
      const c = AzureContainerApp.getBuilder()
        .withId('app-b')
        .withVersion(2, 0, 0)
        .withDisplayName('App B')
        .withImage('nginx:latest')
        .withLocation('westeurope')
        .withResourceGroup('rg-b')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerApp',
      );
      expect(c.id.toString()).toBe('app-b');
      expect(c.version.major).toBe(2);
    });
  });
});
