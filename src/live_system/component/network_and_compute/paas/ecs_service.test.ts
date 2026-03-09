import {describe, expect, it} from 'vitest';
import {AwsEcsService} from './ecs_service';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';
import {DESIRED_COUNT_PARAM} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-svc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Service',
};

describe('AwsEcsService', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsEcsService.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ECSService');
    });

    it('should set provider to AWS', () => {
      const c = AwsEcsService.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set launchType and assignPublicIp when provided', () => {
      const c = AwsEcsService.create({
        ...BASE_CONFIG,
        launchType: 'FARGATE',
        assignPublicIp: false,
      });
      expect(c.parameters.getOptionalFieldByName('launchType')).toBe('FARGATE');
      expect(c.parameters.getOptionalFieldByName('assignPublicIp')).toBe(false);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint workload', () => {
      const workload = Workload.create({
        id: 'bp-svc',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'BP Service',
        containerImage: 'nginx:latest',
      });

      const c = AwsEcsService.satisfy(workload.component).build();
      expect(c.id.toString()).toBe('bp-svc');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('BP Service');
    });

    it('should carry desiredCount from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-svc-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Svc B',
        containerImage: 'nginx:latest',
        desiredCount: 3,
      });

      const c = AwsEcsService.satisfy(workload.component).build();
      expect(c.parameters.getOptionalFieldByName(DESIRED_COUNT_PARAM)).toBe(3);
    });

    it('should allow setting launchType and assignPublicIp', () => {
      const workload = Workload.create({
        id: 'bp-svc-c',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Svc C',
        containerImage: 'nginx:latest',
      });

      const c = AwsEcsService.satisfy(workload.component)
        .withLaunchType('FARGATE')
        .withAssignPublicIp(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('launchType')).toBe('FARGATE');
      expect(c.parameters.getOptionalFieldByName('assignPublicIp')).toBe(false);
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
      }).withLinks([{target: apiWorkload, fromPort: 8080}]);

      const c = AwsEcsService.satisfy(webWorkload.component).build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-workload');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080,
      );
    });

    it('should carry blueprint dependencies (subnet + cluster) unchanged', () => {
      const workload = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web',
        containerImage: 'nginx:latest',
      });

      // Simulate the full blueprint wiring: cluster dep + subnet dep
      const platform = ContainerPlatform.create({
        id: 'app-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App Cluster',
      });
      const wiredByCluster = platform.withWorkloads([workload]).workloads[0];

      // Simulate subnet dep stacked on top (as SubnetNode.withWorkloads does)
      const fullyWiredComponent = {
        ...wiredByCluster.component,
        dependencies: [
          ...wiredByCluster.component.dependencies,
          {id: {toString: () => 'private-subnet'} as never},
        ],
      };

      const svc = AwsEcsService.satisfy(fullyWiredComponent).build();

      const depIds = svc.dependencies.map(d => d.id.toString());
      expect(depIds).toContain('app-cluster');
      expect(depIds).toContain('private-subnet');
    });
  });
});
