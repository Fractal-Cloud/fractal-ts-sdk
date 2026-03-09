import {describe, expect, it} from 'vitest';
import {
  Workload,
  CONTAINER_IMAGE_PARAM,
  CONTAINER_PORT_PARAM,
  CPU_PARAM,
  MEMORY_PARAM,
  DESIRED_COUNT_PARAM,
} from './workload';

const BASE_CONFIG = {
  id: 'my-workload',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Workload',
  containerImage: 'nginx:alpine',
};

describe('Workload', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const node = Workload.create(BASE_CONFIG);
      expect(node.component.type.toString()).toBe('CustomWorkloads.CaaS.Workload');
    });

    it('should set id and displayName', () => {
      const node = Workload.create(BASE_CONFIG);
      expect(node.component.id.toString()).toBe('my-workload');
      expect(node.component.displayName).toBe('My Workload');
    });

    it('should set container image param', () => {
      const node = Workload.create(BASE_CONFIG);
      expect(
        node.component.parameters.getOptionalFieldByName(CONTAINER_IMAGE_PARAM),
      ).toBe('nginx:alpine');
    });

    it('should set optional params when provided', () => {
      const node = Workload.create({
        ...BASE_CONFIG,
        containerPort: 8080,
        cpu: '512',
        memory: '1024',
        desiredCount: 3,
      });
      expect(
        node.component.parameters.getOptionalFieldByName(CONTAINER_PORT_PARAM),
      ).toBe(8080);
      expect(node.component.parameters.getOptionalFieldByName(CPU_PARAM)).toBe(
        '512',
      );
      expect(
        node.component.parameters.getOptionalFieldByName(MEMORY_PARAM),
      ).toBe('1024');
      expect(
        node.component.parameters.getOptionalFieldByName(DESIRED_COUNT_PARAM),
      ).toBe(3);
    });

    it('should start with no links or dependencies', () => {
      const node = Workload.create(BASE_CONFIG);
      expect(node.component.links).toHaveLength(0);
      expect(node.component.dependencies).toHaveLength(0);
    });
  });

  describe('withLinks()', () => {
    it('should add port links to the component', () => {
      const apiNode = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const webNode = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web',
        containerImage: 'nginx:latest',
      }).withLinks([{target: apiNode, fromPort: 8080, protocol: 'tcp'}]);

      expect(webNode.component.links).toHaveLength(1);
      expect(webNode.component.links[0].id.toString()).toBe('api-workload');
      expect(
        webNode.component.links[0].parameters.getOptionalFieldByName(
          'fromPort',
        ),
      ).toBe(8080);
      expect(
        webNode.component.links[0].parameters.getOptionalFieldByName(
          'protocol',
        ),
      ).toBe('tcp');
    });

    it('should be immutable — withLinks returns a new node', () => {
      const apiNode = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const original = Workload.create(BASE_CONFIG);
      const linked = original.withLinks([{target: apiNode, fromPort: 80}]);
      expect(original.component.links).toHaveLength(0);
      expect(linked.component.links).toHaveLength(1);
    });
  });

  describe('withSecurityGroups()', () => {
    it('should add SG membership links', () => {
      const sgNode = Workload.create({
        id: 'app-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App SG',
        containerImage: 'placeholder:latest',
      });
      const workload = Workload.create(BASE_CONFIG).withSecurityGroups([
        sgNode.component,
      ]);
      expect(workload.component.links).toHaveLength(1);
      expect(workload.component.links[0].id.toString()).toBe('app-sg');
    });
  });
});
