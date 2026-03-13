import {describe, expect, it} from 'vitest';
import {GcpCloudRunService} from './gcp_cloud_run_service';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-service',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Service',
  image: 'nginx:latest',
  region: 'us-central1',
};

describe('GcpCloudRunService', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpCloudRunService.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.CaaS.CloudRunService',
      );
    });

    it('should set provider to GCP', () => {
      const c = GcpCloudRunService.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set id, displayName, and required params', () => {
      const c = GcpCloudRunService.create({
        ...BASE_CONFIG,
        description: 'My Cloud Run service',
      });
      expect(c.id.toString()).toBe('my-service');
      expect(c.displayName).toBe('My Service');
      expect(c.description).toBe('My Cloud Run service');
      expect(c.parameters.getOptionalFieldByName('image')).toBe('nginx:latest');
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1',
      );
    });

    it('should set optional params when provided', () => {
      const c = GcpCloudRunService.create({
        ...BASE_CONFIG,
        port: 8080,
        cpu: '1000m',
        memory: '512Mi',
        minInstances: 1,
        maxInstances: 10,
        concurrency: 80,
        serviceAccountEmail: 'sa@project.iam.gserviceaccount.com',
        ingress: 'all',
      });
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe('1000m');
      expect(c.parameters.getOptionalFieldByName('memory')).toBe('512Mi');
      expect(c.parameters.getOptionalFieldByName('minInstances')).toBe(1);
      expect(c.parameters.getOptionalFieldByName('maxInstances')).toBe(10);
      expect(c.parameters.getOptionalFieldByName('concurrency')).toBe(80);
      expect(
        c.parameters.getOptionalFieldByName('serviceAccountEmail'),
      ).toBe('sa@project.iam.gserviceaccount.com');
      expect(c.parameters.getOptionalFieldByName('ingress')).toBe('all');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint workload', () => {
      const workload = Workload.create({
        id: 'bp-svc',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'BP Service',
        containerImage: 'nginx:latest',
      });

      const c = GcpCloudRunService.satisfy(workload.component)
        .withRegion('us-central1')
        .build();
      expect(c.id.toString()).toBe('bp-svc');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('BP Service');
    });

    it('should carry containerImage, containerPort, cpu, and memory from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-svc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Svc',
        containerImage: 'myimage:v1',
        containerPort: 3000,
        cpu: 0.5,
        memory: '256Mi',
      });

      const c = GcpCloudRunService.satisfy(workload.component)
        .withRegion('europe-west1')
        .build();
      expect(c.parameters.getOptionalFieldByName('image')).toBe('myimage:v1');
      expect(c.parameters.getOptionalFieldByName('port')).toBe(3000);
      expect(c.parameters.getOptionalFieldByName('cpu')).toBe(0.5);
      expect(c.parameters.getOptionalFieldByName('memory')).toBe('256Mi');
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const workload = Workload.create({
        id: 'bp-svc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Svc',
        containerImage: 'nginx:latest',
      });

      const c = GcpCloudRunService.satisfy(workload.component)
        .withRegion('us-east1')
        .withMinInstances(1)
        .withMaxInstances(10)
        .withConcurrency(80)
        .withServiceAccountEmail('sa@project.iam.gserviceaccount.com')
        .withIngress('internal')
        .build();

      expect(c.parameters.getOptionalFieldByName('region')).toBe('us-east1');
      expect(c.parameters.getOptionalFieldByName('minInstances')).toBe(1);
      expect(c.parameters.getOptionalFieldByName('maxInstances')).toBe(10);
      expect(c.parameters.getOptionalFieldByName('concurrency')).toBe(80);
      expect(
        c.parameters.getOptionalFieldByName('serviceAccountEmail'),
      ).toBe('sa@project.iam.gserviceaccount.com');
      expect(c.parameters.getOptionalFieldByName('ingress')).toBe('internal');
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

      const c = GcpCloudRunService.satisfy(webWorkload.component)
        .withRegion('us-central1')
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-workload');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080,
      );
    });
  });

  describe('getBuilder()', () => {
    it('should build a service via fluent builder', () => {
      const c = GcpCloudRunService.getBuilder()
        .withId('svc-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Svc B')
        .withImage('nginx:latest')
        .withRegion('us-central1')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.CaaS.CloudRunService',
      );
      expect(c.id.toString()).toBe('svc-b');
      expect(c.version.major).toBe(2);
    });
  });
});
