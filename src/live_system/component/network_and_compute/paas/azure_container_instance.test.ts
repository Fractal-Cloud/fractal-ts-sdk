import {describe, expect, it} from 'vitest';
import {AzureContainerInstance} from './azure_container_instance';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-instance',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Instance',
  image: 'nginx:latest',
  location: 'eastus',
  resourceGroup: 'my-rg',
};

describe('AzureContainerInstance', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureContainerInstance.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerInstance',
      );
    });

    it('should set provider to Azure', () => {
      const c = AzureContainerInstance.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id, displayName, and required params', () => {
      const c = AzureContainerInstance.create({
        ...BASE_CONFIG,
        description: 'My container instance',
      });
      expect(c.id.toString()).toBe('my-instance');
      expect(c.displayName).toBe('My Instance');
      expect(c.description).toBe('My container instance');
      expect(c.parameters.getOptionalFieldByName('image')).toBe('nginx:latest');
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional params when provided', () => {
      const c = AzureContainerInstance.create({
        ...BASE_CONFIG,
        port: 8080,
        cpu: 2,
        memoryInGb: 4,
        restartPolicy: 'Always',
        publicIp: true,
        dnsNameLabel: 'my-app',
      });
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe(2);
      expect(c.parameters.getOptionalFieldByName('memoryInGB')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('restartPolicy')).toBe(
        'Always',
      );
      expect(c.parameters.getOptionalFieldByName('publicIp')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('dnsNameLabel')).toBe(
        'my-app',
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint workload', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'nginx:latest',
      });

      const c = AzureContainerInstance.satisfy(workload.component)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(c.id.toString()).toBe('bp-instance');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('BP Instance');
    });

    it('should carry containerImage and containerPort from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'myimage:v1',
        containerPort: 3000,
      });

      const c = AzureContainerInstance.satisfy(workload.component)
        .withLocation('westus')
        .withResourceGroup('rg')
        .build();
      expect(c.parameters.getOptionalFieldByName('image')).toBe('myimage:v1');
      expect(c.parameters.getOptionalFieldByName('port')).toBe(3000);
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'nginx:latest',
      });

      const c = AzureContainerInstance.satisfy(workload.component)
        .withLocation('eastus')
        .withResourceGroup('my-rg')
        .withCpu(2)
        .withMemoryInGb(4)
        .withRestartPolicy('OnFailure')
        .withPublicIp(false)
        .withDnsNameLabel('my-label')
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg',
      );
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe(2);
      expect(c.parameters.getOptionalFieldByName('memoryInGB')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('restartPolicy')).toBe(
        'OnFailure',
      );
      expect(c.parameters.getOptionalFieldByName('publicIp')).toBe(false);
      expect(c.parameters.getOptionalFieldByName('dnsNameLabel')).toBe(
        'my-label',
      );
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

      const c = AzureContainerInstance.satisfy(webWorkload.component)
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
    it('should build an instance via fluent builder', () => {
      const c = AzureContainerInstance.getBuilder()
        .withId('instance-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Instance B')
        .withImage('nginx:latest')
        .withLocation('westeurope')
        .withResourceGroup('rg-b')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.AzureContainerInstance',
      );
      expect(c.id.toString()).toBe('instance-b');
      expect(c.version.major).toBe(2);
    });
  });
});
