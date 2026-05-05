import {describe, expect, it} from 'vitest';
import {
  Workload,
  CONTAINER_IMAGE_PARAM,
  CONTAINER_PORT_PARAM,
  CPU_PARAM,
  MEMORY_PARAM,
  DESIRED_COUNT_PARAM,
} from './workload';
import {SecurityGroup} from '../../network_and_compute/iaas/security_group';
import {CaaSMessagingEntity} from '../../messaging/caas/entity';
import {MessagingEntity} from '../../messaging/paas/entity';

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

  describe('linkToWorkload()', () => {
    it('should add port links to the component', () => {
      const api = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const web = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web',
        containerImage: 'nginx:latest',
      }).linkToWorkload([{target: api, fromPort: 8080, protocol: 'tcp'}]);

      expect(web.component.links).toHaveLength(1);
      expect(web.component.links[0].id.toString()).toBe('api-workload');
      expect(
        web.component.links[0].parameters.getOptionalFieldByName('fromPort'),
      ).toBe(8080);
      expect(
        web.component.links[0].parameters.getOptionalFieldByName('protocol'),
      ).toBe('tcp');
    });

    it('should be immutable — linkToWorkload returns a new node', () => {
      const api = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const original = Workload.create(BASE_CONFIG);
      const linked = original.linkToWorkload([{target: api, fromPort: 80}]);
      expect(original.component.links).toHaveLength(0);
      expect(linked.component.links).toHaveLength(1);
    });
  });

  describe('linkToSecurityGroup()', () => {
    it('should add a no-settings SG membership link', () => {
      const sg = SecurityGroup.create({
        id: 'app-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App SG',
        description: 'Application security group',
      });
      const workload = Workload.create(BASE_CONFIG).linkToSecurityGroup([sg]);
      expect(workload.component.links).toHaveLength(1);
      expect(workload.component.links[0].id.toString()).toBe('app-sg');
      expect(workload.component.links[0].parameters.toMap()).toEqual({});
    });

    it('should not add a dependency on the SG', () => {
      const sg = SecurityGroup.create({
        id: 'app-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App SG',
        description: 'Application security group',
      });
      const workload = Workload.create(BASE_CONFIG).linkToSecurityGroup([sg]);
      expect(workload.component.dependencies).toHaveLength(0);
    });
  });

  describe('linkToMessagingEntity()', () => {
    const entityVersion = {major: 1, minor: 0, patch: 0};

    it('should add a publish link to a CaaS entity with the entity type carried through', () => {
      const topic = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: entityVersion,
        displayName: 'Orders',
      });
      const workload = Workload.create(BASE_CONFIG).linkToMessagingEntity([
        {target: topic, access: 'publish'},
      ]);

      expect(workload.component.links).toHaveLength(1);
      const link = workload.component.links[0];
      expect(link.id.toString()).toBe('orders-topic');
      expect(link.type.toString()).toBe('Messaging.CaaS.Entity');
      expect(link.parameters.getOptionalFieldByName('access')).toBe('publish');
    });

    it('should support PaaS messaging entities and carry their type through', () => {
      const queue = MessagingEntity.create({
        id: 'orders-queue',
        version: entityVersion,
        displayName: 'Orders',
      });
      const workload = Workload.create(BASE_CONFIG).linkToMessagingEntity([
        {target: queue, access: 'subscribe', consumerGroup: 'order-processor'},
      ]);

      const link = workload.component.links[0];
      expect(link.type.toString()).toBe('Messaging.PaaS.Entity');
      expect(link.parameters.getOptionalFieldByName('access')).toBe('subscribe');
      expect(link.parameters.getOptionalFieldByName('consumerGroup')).toBe(
        'order-processor',
      );
    });

    it('should accept publish-subscribe access and a startingPosition setting', () => {
      const topic = CaaSMessagingEntity.create({
        id: 'events-topic',
        version: entityVersion,
        displayName: 'Events',
      });
      const workload = Workload.create(BASE_CONFIG).linkToMessagingEntity([
        {
          target: topic,
          access: 'publish-subscribe',
          consumerGroup: 'audit',
          startingPosition: 'end',
        },
      ]);

      const link = workload.component.links[0];
      expect(link.parameters.getOptionalFieldByName('access')).toBe(
        'publish-subscribe',
      );
      expect(link.parameters.getOptionalFieldByName('startingPosition')).toBe(
        'end',
      );
    });

    it('should accumulate multiple messaging links', () => {
      const orders = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: entityVersion,
        displayName: 'Orders',
      });
      const audit = CaaSMessagingEntity.create({
        id: 'audit-topic',
        version: entityVersion,
        displayName: 'Audit',
      });
      const workload = Workload.create(BASE_CONFIG).linkToMessagingEntity([
        {target: orders, access: 'publish'},
        {target: audit, access: 'subscribe', consumerGroup: 'auditor'},
      ]);
      expect(workload.component.links).toHaveLength(2);
      expect(workload.component.links[0].id.toString()).toBe('orders-topic');
      expect(workload.component.links[1].id.toString()).toBe('audit-topic');
    });

    it('should not add a dependency on the entity (links are runtime, not ordering)', () => {
      const topic = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: entityVersion,
        displayName: 'Orders',
      });
      const workload = Workload.create(BASE_CONFIG).linkToMessagingEntity([
        {target: topic, access: 'publish'},
      ]);
      expect(workload.component.dependencies).toHaveLength(0);
    });

    it('should be immutable — linkToMessagingEntity returns a new node', () => {
      const topic = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: entityVersion,
        displayName: 'Orders',
      });
      const original = Workload.create(BASE_CONFIG);
      const linked = original.linkToMessagingEntity([
        {target: topic, access: 'publish'},
      ]);
      expect(original.component.links).toHaveLength(0);
      expect(linked.component.links).toHaveLength(1);
    });
  });
});
