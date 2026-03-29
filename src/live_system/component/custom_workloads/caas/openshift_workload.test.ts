import {describe, expect, it} from 'vitest';
import {OpenshiftWorkload} from './openshift_workload';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-workload',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Workload',
  image: 'nginx:latest',
};

describe('OpenshiftWorkload', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OpenshiftWorkload.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('CustomWorkloads.CaaS.OpenshiftWorkload');
    });

    it('should set provider to RedHat', () => {
      const c = OpenshiftWorkload.create(BASE_CONFIG);
      expect(c.provider).toBe('RedHat');
    });

    it('should set required image parameter', () => {
      const c = OpenshiftWorkload.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('image')).toBe(
        'nginx:latest'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = OpenshiftWorkload.create({
        ...BASE_CONFIG,
        port: 8080,
        name: 'web',
        replicas: 3,
        namespace: 'production',
        workloadType: 'Deployment',
        cpuRequest: '250m',
        cpuLimit: '500m',
        memoryRequest: '256Mi',
        memoryLimit: '512Mi',
        protocol: 'TCP',
        envVars: '{"FOO":"bar"}',
        serviceAccountName: 'my-sa',
        command: '["node"]',
        args: '["server.js"]',
        volumeMounts: '[{"name":"data","mountPath":"/data"}]',
      });
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('name')).toBe('web');
      expect(c.parameters.getOptionalFieldByName('replicas')).toBe(3);
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'production'
      );
      expect(c.parameters.getOptionalFieldByName('workloadType')).toBe(
        'Deployment'
      );
      expect(c.parameters.getOptionalFieldByName('cpuRequest')).toBe('250m');
      expect(c.parameters.getOptionalFieldByName('cpuLimit')).toBe('500m');
      expect(c.parameters.getOptionalFieldByName('memoryRequest')).toBe(
        '256Mi'
      );
      expect(c.parameters.getOptionalFieldByName('memoryLimit')).toBe('512Mi');
      expect(c.parameters.getOptionalFieldByName('protocol')).toBe('TCP');
      expect(c.parameters.getOptionalFieldByName('envVars')).toBe(
        '{"FOO":"bar"}'
      );
      expect(c.parameters.getOptionalFieldByName('serviceAccountName')).toBe(
        'my-sa'
      );
      expect(c.parameters.getOptionalFieldByName('command')).toBe('["node"]');
      expect(c.parameters.getOptionalFieldByName('args')).toBe(
        '["server.js"]'
      );
      expect(c.parameters.getOptionalFieldByName('volumeMounts')).toBe(
        '[{"name":"data","mountPath":"/data"}]'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OpenshiftWorkload.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('port')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('namespace')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('workloadType')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-workload',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Workload',
        description: 'A workload',
        containerImage: 'myapp:v1',
      });

      const c = OpenshiftWorkload.satisfy(workload.component).build();

      expect(c.id.toString()).toBe('bp-workload');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.displayName).toBe('Blueprint Workload');
      expect(c.description).toBe('A workload');
    });

    it('should carry blueprint params with mapped keys', () => {
      const workload = Workload.create({
        id: 'bp-workload-map',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Workload Map',
        containerImage: 'myapp:v2',
        containerPort: 3000,
        containerName: 'app',
        cpu: '512',
        memory: '1024',
        desiredCount: 5,
      });

      const c = OpenshiftWorkload.satisfy(workload.component).build();

      // containerImage → image
      expect(c.parameters.getOptionalFieldByName('image')).toBe('myapp:v2');
      // containerPort → port
      expect(c.parameters.getOptionalFieldByName('port')).toBe(3000);
      // containerName → name
      expect(c.parameters.getOptionalFieldByName('name')).toBe('app');
      // cpu → cpuRequest
      expect(c.parameters.getOptionalFieldByName('cpuRequest')).toBe('512');
      // memory → memoryRequest
      expect(c.parameters.getOptionalFieldByName('memoryRequest')).toBe(
        '1024'
      );
      // desiredCount → replicas
      expect(c.parameters.getOptionalFieldByName('replicas')).toBe(5);
    });

    it('should carry dependencies from the blueprint unchanged', () => {
      const rawWorkload = Workload.getBuilder()
        .withId('dep-workload')
        .withVersion(1, 0, 0)
        .withDisplayName('Dep Workload')
        .withContainerImage('nginx:latest')
        .build();
      const workloadWithDep = {
        ...rawWorkload,
        dependencies: [{id: rawWorkload.id}],
      };

      const c = OpenshiftWorkload.satisfy(workloadWithDep).build();
      expect(c.dependencies).toHaveLength(1);
    });

    it('should carry links from the blueprint unchanged', () => {
      const target = Workload.create({
        id: 'target-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Target',
        containerImage: 'nginx:latest',
      });
      const source = Workload.create({
        id: 'source-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Source',
        containerImage: 'app:latest',
      }).linkToWorkload([{target, fromPort: 8080, protocol: 'tcp'}]);

      const c = OpenshiftWorkload.satisfy(source.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-workload');
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const workload = Workload.create({
        id: 'bp-workload-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Workload Vendor',
        containerImage: 'nginx:latest',
      });

      const c = OpenshiftWorkload.satisfy(workload.component)
        .withNamespace('production')
        .withWorkloadType('StatefulSet')
        .withCpuLimit('1000m')
        .withMemoryLimit('2Gi')
        .withProtocol('TCP')
        .withEnvVars('{"KEY":"value"}')
        .withServiceAccountName('my-sa')
        .withCommand('["node"]')
        .withArgs('["index.js"]')
        .withVolumeMounts('[{"name":"vol","mountPath":"/mnt"}]')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'production'
      );
      expect(c.parameters.getOptionalFieldByName('workloadType')).toBe(
        'StatefulSet'
      );
      expect(c.parameters.getOptionalFieldByName('cpuLimit')).toBe('1000m');
      expect(c.parameters.getOptionalFieldByName('memoryLimit')).toBe('2Gi');
      expect(c.parameters.getOptionalFieldByName('protocol')).toBe('TCP');
      expect(c.parameters.getOptionalFieldByName('envVars')).toBe(
        '{"KEY":"value"}'
      );
      expect(c.parameters.getOptionalFieldByName('serviceAccountName')).toBe(
        'my-sa'
      );
      expect(c.parameters.getOptionalFieldByName('command')).toBe('["node"]');
      expect(c.parameters.getOptionalFieldByName('args')).toBe(
        '["index.js"]'
      );
      expect(c.parameters.getOptionalFieldByName('volumeMounts')).toBe(
        '[{"name":"vol","mountPath":"/mnt"}]'
      );
    });
  });
});
