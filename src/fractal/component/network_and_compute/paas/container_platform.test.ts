import {describe, expect, it} from 'vitest';
import {ContainerPlatform} from './container_platform';
import {Workload} from '../../custom_workloads/caas/workload';
import {CaaSApiGateway} from '../../api_management/caas/api_gateway';
import {CaaSBroker} from '../../messaging/caas/broker';
import {CaaSMessagingEntity} from '../../messaging/caas/entity';
import {Search} from '../../storage/caas/search';
import {SearchEntity} from '../../storage/caas/search_entity';
import {Monitoring} from '../../observability/caas/monitoring';
import {Tracing} from '../../observability/caas/tracing';
import {Logging} from '../../observability/caas/logging';
import {ServiceMesh} from '../../security/caas/service_mesh';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

const VERSION = {major: 1, minor: 0, patch: 0};

const workloadConfig = {
  version: VERSION,
  containerImage: 'nginx:latest',
};

describe('ContainerPlatform', () => {
  describe('create()', () => {
    it('should build a node with the correct type string', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.platform.type.toString()).toBe(
        'NetworkAndCompute.PaaS.ContainerPlatform',
      );
    });

    it('should set id and displayName', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.platform.id.toString()).toBe('my-cluster');
      expect(node.platform.displayName).toBe('My Cluster');
    });

    it('should set description when provided', () => {
      const node = ContainerPlatform.create({
        ...BASE_CONFIG,
        description: 'Hosts all container workloads',
      });
      expect(node.platform.description).toBe('Hosts all container workloads');
    });

    it('should set nodePools parameter', () => {
      const node = ContainerPlatform.create({
        ...BASE_CONFIG,
        nodePools: [{name: 'default', minNodeCount: 1, maxNodeCount: 3}],
      });
      expect(
        node.platform.parameters.getOptionalFieldByName('nodePools'),
      ).toEqual([{name: 'default', minNodeCount: 1, maxNodeCount: 3}]);
    });

    it('should start with empty CaaS collections', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.workloads).toHaveLength(0);
      expect(node.brokers).toHaveLength(0);
      expect(node.searches).toHaveLength(0);
      expect(node.apiGateway).toBeUndefined();
      expect(node.monitoring).toBeUndefined();
      expect(node.tracing).toBeUndefined();
      expect(node.logging).toBeUndefined();
      expect(node.serviceMesh).toBeUndefined();
    });

    it('components should contain only the platform when no CaaS services are wired', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.components).toHaveLength(1);
      expect(node.components[0].id.toString()).toBe('my-cluster');
    });
  });

  describe('withWorkloads()', () => {
    it('should auto-wire the platform as a dependency of each workload', () => {
      const w1 = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const w2 = Workload.create({
        id: 'api-workload',
        displayName: 'API',
        ...workloadConfig,
      });

      const node = ContainerPlatform.create(BASE_CONFIG).withWorkloads([
        w1,
        w2,
      ]);

      expect(node.workloads).toHaveLength(2);
      for (const wired of node.workloads) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-cluster');
      }
    });

    it('should preserve existing workload dependencies when stacking cluster dep', () => {
      const subnetDep = {
        id: {toString: () => 'private-subnet'} as never,
      };
      const w = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const wWithSubnet = {
        ...w,
        component: {
          ...w.component,
          dependencies: [subnetDep],
        },
      };

      const node = ContainerPlatform.create(BASE_CONFIG).withWorkloads([
        wWithSubnet,
      ]);
      const depIds = node.workloads[0].component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('private-subnet');
      expect(depIds).toContain('my-cluster');
    });

    it('should be immutable — withWorkloads returns a new node', () => {
      const w = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const original = ContainerPlatform.create(BASE_CONFIG);
      const withWorkloads = original.withWorkloads([w]);
      expect(original.workloads).toHaveLength(0);
      expect(withWorkloads.workloads).toHaveLength(1);
    });
  });

  describe('withApiGateway()', () => {
    it('should auto-wire the platform as a dependency of the gateway', () => {
      const gw = CaaSApiGateway.create({
        id: 'edge-gw',
        version: VERSION,
        displayName: 'Edge Gateway',
      });
      const node = ContainerPlatform.create(BASE_CONFIG).withApiGateway(gw);

      expect(node.apiGateway).toBeDefined();
      const depIds = node.apiGateway!.component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-cluster');
    });

    it('should keep components in sync with the wired gateway', () => {
      const gw = CaaSApiGateway.create({
        id: 'edge-gw',
        version: VERSION,
        displayName: 'Edge Gateway',
      });
      const node = ContainerPlatform.create(BASE_CONFIG).withApiGateway(gw);
      const ids = node.components.map(c => c.id.toString());
      expect(ids).toEqual(['my-cluster', 'edge-gw']);
    });

    it('calling withApiGateway twice should replace, not duplicate', () => {
      const a = CaaSApiGateway.create({
        id: 'gw-a',
        version: VERSION,
        displayName: 'GW A',
      });
      const b = CaaSApiGateway.create({
        id: 'gw-b',
        version: VERSION,
        displayName: 'GW B',
      });
      const node = ContainerPlatform.create(BASE_CONFIG)
        .withApiGateway(a)
        .withApiGateway(b);

      expect(node.apiGateway?.component.id.toString()).toBe('gw-b');
      const ids = node.components.map(c => c.id.toString());
      expect(ids).not.toContain('gw-a');
      expect(ids).toContain('gw-b');
    });
  });

  describe('withBrokers()', () => {
    it('should auto-wire the platform as a dependency of each broker', () => {
      const broker = CaaSBroker.create({
        id: 'kafka-broker',
        version: VERSION,
        displayName: 'Kafka',
      });
      const node = ContainerPlatform.create(BASE_CONFIG).withBrokers([broker]);

      const depIds = node.brokers[0].broker.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-cluster');
    });

    it('should preserve broker→entity wiring (entity transitively depends via broker)', () => {
      const e1 = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: VERSION,
        displayName: 'Orders',
      });
      const broker = CaaSBroker.create({
        id: 'kafka-broker',
        version: VERSION,
        displayName: 'Kafka',
      }).withEntities([e1]);

      const node = ContainerPlatform.create(BASE_CONFIG).withBrokers([broker]);

      expect(node.brokers[0].entities).toHaveLength(1);
      const entityDepIds = node.brokers[0].entities[0].component.dependencies.map(
        d => d.id.toString(),
      );
      expect(entityDepIds).toContain('kafka-broker');
      expect(entityDepIds).not.toContain('my-cluster');
    });

    it('components should include broker and its entities', () => {
      const e1 = CaaSMessagingEntity.create({
        id: 'orders-topic',
        version: VERSION,
        displayName: 'Orders',
      });
      const broker = CaaSBroker.create({
        id: 'kafka-broker',
        version: VERSION,
        displayName: 'Kafka',
      }).withEntities([e1]);

      const node = ContainerPlatform.create(BASE_CONFIG).withBrokers([broker]);
      const ids = node.components.map(c => c.id.toString());
      expect(ids).toEqual(['my-cluster', 'kafka-broker', 'orders-topic']);
    });
  });

  describe('withSearches()', () => {
    it('should auto-wire the platform as a dependency of each search', () => {
      const search = Search.create({
        id: 'search-cluster',
        version: VERSION,
        displayName: 'Search',
      });
      const node = ContainerPlatform.create(BASE_CONFIG).withSearches([search]);

      const depIds = node.searches[0].search.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-cluster');
    });

    it('components should include search and its entities', () => {
      const idx = SearchEntity.create({
        id: 'orders-index',
        version: VERSION,
        displayName: 'Orders Index',
      });
      const search = Search.create({
        id: 'search-cluster',
        version: VERSION,
        displayName: 'Search',
      }).withEntities([idx]);

      const node = ContainerPlatform.create(BASE_CONFIG).withSearches([search]);
      const ids = node.components.map(c => c.id.toString());
      expect(ids).toEqual(['my-cluster', 'search-cluster', 'orders-index']);
    });
  });

  describe('withMonitoring/withTracing/withLogging/withServiceMesh', () => {
    it('should auto-wire the platform dep on each singleton CaaS service', () => {
      const m = Monitoring.create({
        id: 'mon',
        version: VERSION,
        displayName: 'Monitoring',
      });
      const t = Tracing.create({
        id: 'trc',
        version: VERSION,
        displayName: 'Tracing',
      });
      const l = Logging.create({
        id: 'log',
        version: VERSION,
        displayName: 'Logging',
      });
      const sm = ServiceMesh.create({
        id: 'mesh',
        version: VERSION,
        displayName: 'Mesh',
      });

      const node = ContainerPlatform.create(BASE_CONFIG)
        .withMonitoring(m)
        .withTracing(t)
        .withLogging(l)
        .withServiceMesh(sm);

      const depsOf = (id: string): string[] => {
        const c = node.components.find(x => x.id.toString() === id);
        return c!.dependencies.map(d => d.id.toString());
      };

      expect(node.monitoring).toBeDefined();
      expect(node.tracing).toBeDefined();
      expect(node.logging).toBeDefined();
      expect(node.serviceMesh).toBeDefined();
      expect(depsOf('mon')).toContain('my-cluster');
      expect(depsOf('trc')).toContain('my-cluster');
      expect(depsOf('log')).toContain('my-cluster');
      expect(depsOf('mesh')).toContain('my-cluster');
    });

    it('calling a singleton withXxx twice should replace, not duplicate', () => {
      const m1 = Monitoring.create({
        id: 'mon-a',
        version: VERSION,
        displayName: 'Mon A',
      });
      const m2 = Monitoring.create({
        id: 'mon-b',
        version: VERSION,
        displayName: 'Mon B',
      });
      const node = ContainerPlatform.create(BASE_CONFIG)
        .withMonitoring(m1)
        .withMonitoring(m2);

      expect(node.monitoring?.component.id.toString()).toBe('mon-b');
      const monIds = node.components
        .filter(c => c.id.toString().startsWith('mon-'))
        .map(c => c.id.toString());
      expect(monIds).toEqual(['mon-b']);
    });

    it('chained withXxx calls should accumulate across types', () => {
      const w = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const gw = CaaSApiGateway.create({
        id: 'edge-gw',
        version: VERSION,
        displayName: 'GW',
      });
      const m = Monitoring.create({
        id: 'mon',
        version: VERSION,
        displayName: 'Mon',
      });

      const node = ContainerPlatform.create(BASE_CONFIG)
        .withWorkloads([w])
        .withApiGateway(gw)
        .withMonitoring(m);

      expect(node.workloads).toHaveLength(1);
      expect(node.apiGateway?.component.id.toString()).toBe('edge-gw');
      expect(node.monitoring?.component.id.toString()).toBe('mon');
      const ids = node.components.map(c => c.id.toString());
      expect(ids).toContain('my-cluster');
      expect(ids).toContain('web-workload');
      expect(ids).toContain('edge-gw');
      expect(ids).toContain('mon');
    });
  });

  describe('getBuilder()', () => {
    it('should build a component via fluent builder', () => {
      const c = ContainerPlatform.getBuilder()
        .withId('platform-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Platform B')
        .build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ContainerPlatform');
      expect(c.id.toString()).toBe('platform-b');
      expect(c.version.major).toBe(2);
    });
  });
});
