import {describe, expect, it} from 'vitest';
import {Custom} from './index';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../values/service_delivery_model';
import {VirtualNetwork} from '../fractal/component/network_and_compute/iaas/virtual_network';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BLUEPRINT_DEF = {
  domain: 'Analytics',
  serviceDeliveryModel: ServiceDeliveryModel.PaaS,
  name: 'TimeSeriesStore',
};

const OFFER_DEF = {
  domain: 'Analytics',
  serviceDeliveryModel: ServiceDeliveryModel.PaaS,
  name: 'InfluxDb',
  provider: 'CustomProvider',
};

const BASE_COMPONENT = {
  id: 'metrics-db',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Metrics Database',
};

// ── Factory creation ──────────────────────────────────────────────────────────

describe('Custom.blueprint()', () => {
  it('should create a factory with the correct type string', () => {
    const factory = Custom.blueprint(BLUEPRINT_DEF);
    expect(factory.typeString).toBe('Analytics.PaaS.TimeSeriesStore');
  });

  it('should accept built-in domain values', () => {
    const factory = Custom.blueprint({
      domain: InfrastructureDomain.Storage,
      serviceDeliveryModel: ServiceDeliveryModel.PaaS,
      name: 'CustomStore',
    });
    expect(factory.typeString).toBe('Storage.PaaS.CustomStore');
  });

  it('should throw on invalid PascalCase name', () => {
    expect(() =>
      Custom.blueprint({...BLUEPRINT_DEF, name: 'not_pascal'}),
    ).toThrow(SyntaxError);
  });

  it('should throw on empty name', () => {
    expect(() => Custom.blueprint({...BLUEPRINT_DEF, name: ''})).toThrow(
      SyntaxError,
    );
  });
});

describe('Custom.offer()', () => {
  it('should create a factory with the correct type string', () => {
    const factory = Custom.offer(OFFER_DEF);
    expect(factory.typeString).toBe('Analytics.PaaS.InfluxDb');
  });

  it('should throw on invalid PascalCase name', () => {
    expect(() => Custom.offer({...OFFER_DEF, name: 'bad-name'})).toThrow(
      SyntaxError,
    );
  });
});

// ── Blueprint component creation ──────────────────────────────────────────────

describe('CustomBlueprintFactory', () => {
  const factory = Custom.blueprint(BLUEPRINT_DEF);

  describe('create()', () => {
    it('should produce a component with the correct type string', () => {
      const c = factory.create(BASE_COMPONENT);
      expect(c.type.toString()).toBe('Analytics.PaaS.TimeSeriesStore');
    });

    it('should set id, version, displayName', () => {
      const c = factory.create(BASE_COMPONENT);
      expect(c.id.toString()).toBe('metrics-db');
      expect(c.version.major).toBe(1);
      expect(c.version.minor).toBe(0);
      expect(c.version.patch).toBe(0);
      expect(c.displayName).toBe('Metrics Database');
    });

    it('should set description when provided', () => {
      const c = factory.create({
        ...BASE_COMPONENT,
        description: 'A custom metrics database',
      });
      expect(c.description).toBe('A custom metrics database');
    });

    it('should set parameters from config', () => {
      const c = factory.create({
        ...BASE_COMPONENT,
        parameters: {retentionDays: '90', replicationFactor: 3},
      });
      expect(c.parameters.getOptionalFieldByName('retentionDays')).toBe('90');
      expect(c.parameters.getOptionalFieldByName('replicationFactor')).toBe(3);
    });

    it('should set dependencies when provided', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'dep-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Dep VPC',
      });
      const c = factory.create({
        ...BASE_COMPONENT,
        dependencies: [{id: vpc.id}],
      });
      expect(c.dependencies).toHaveLength(1);
      expect(c.dependencies[0].id.toString()).toBe('dep-vpc');
    });

    it('should produce a component with no provider field', () => {
      const c = factory.create(BASE_COMPONENT);
      expect('provider' in c).toBe(false);
    });
  });

  describe('getBuilder()', () => {
    it('should build a component via fluent builder', () => {
      const c = factory
        .getBuilder()
        .withId('builder-db')
        .withVersion(2, 0, 1)
        .withDisplayName('Builder DB')
        .withParameter('retention', '30d')
        .build();

      expect(c.type.toString()).toBe('Analytics.PaaS.TimeSeriesStore');
      expect(c.id.toString()).toBe('builder-db');
      expect(c.version.major).toBe(2);
      expect(c.parameters.getOptionalFieldByName('retention')).toBe('30d');
    });

    it('should support withParameters for batch params', () => {
      const c = factory
        .getBuilder()
        .withId('batch-db')
        .withVersion(1, 0, 0)
        .withDisplayName('Batch DB')
        .withParameters({a: '1', b: '2', c: '3'})
        .build();

      expect(c.parameters.getOptionalFieldByName('a')).toBe('1');
      expect(c.parameters.getOptionalFieldByName('b')).toBe('2');
      expect(c.parameters.getOptionalFieldByName('c')).toBe('3');
    });
  });
});

// ── Offer component creation ──────────────────────────────────────────────────

describe('CustomOfferFactory', () => {
  const factory = Custom.offer(OFFER_DEF);

  describe('create()', () => {
    it('should produce a live system component with the correct type', () => {
      const c = factory.create(BASE_COMPONENT);
      expect(c.type.toString()).toBe('Analytics.PaaS.InfluxDb');
    });

    it('should set provider from factory config', () => {
      const c = factory.create(BASE_COMPONENT);
      expect(c.provider).toBe('CustomProvider');
    });

    it('should set parameters', () => {
      const c = factory.create({
        ...BASE_COMPONENT,
        parameters: {bucket: 'metrics'},
      });
      expect(c.parameters.getOptionalFieldByName('bucket')).toBe('metrics');
    });
  });

  describe('getBuilder()', () => {
    it('should build a live system component via fluent builder', () => {
      const c = factory
        .getBuilder()
        .withId('builder-influx')
        .withVersion(1, 0, 0)
        .withDisplayName('Builder InfluxDb')
        .withParameter('bucket', 'events')
        .build();

      expect(c.type.toString()).toBe('Analytics.PaaS.InfluxDb');
      expect(c.provider).toBe('CustomProvider');
      expect(c.parameters.getOptionalFieldByName('bucket')).toBe('events');
    });
  });

  describe('satisfy()', () => {
    const bpFactory = Custom.blueprint(BLUEPRINT_DEF);

    it('should copy id, version, displayName from blueprint', () => {
      const bp = bpFactory.create({
        ...BASE_COMPONENT,
        description: 'My description',
      });
      const c = factory.satisfy(bp).build();

      expect(c.id.toString()).toBe('metrics-db');
      expect(c.version.major).toBe(1);
      expect(c.version.minor).toBe(0);
      expect(c.version.patch).toBe(0);
      expect(c.displayName).toBe('Metrics Database');
      expect(c.description).toBe('My description');
    });

    it('should set the offer type and provider, not the blueprint type', () => {
      const bp = bpFactory.create(BASE_COMPONENT);
      const c = factory.satisfy(bp).build();

      expect(c.type.toString()).toBe('Analytics.PaaS.InfluxDb');
      expect(c.provider).toBe('CustomProvider');
    });

    it('should copy all blueprint parameters', () => {
      const bp = bpFactory.create({
        ...BASE_COMPONENT,
        parameters: {retentionDays: '90', replicationFactor: 3},
      });
      const c = factory.satisfy(bp).build();

      expect(c.parameters.getOptionalFieldByName('retentionDays')).toBe('90');
      expect(c.parameters.getOptionalFieldByName('replicationFactor')).toBe(3);
    });

    it('should allow adding vendor-specific parameters', () => {
      const bp = bpFactory.create({
        ...BASE_COMPONENT,
        parameters: {retentionDays: '90'},
      });
      const c = factory
        .satisfy(bp)
        .withParameter('bucket', 'metrics')
        .withParameter('orgId', 'my-org')
        .build();

      expect(c.parameters.getOptionalFieldByName('retentionDays')).toBe('90');
      expect(c.parameters.getOptionalFieldByName('bucket')).toBe('metrics');
      expect(c.parameters.getOptionalFieldByName('orgId')).toBe('my-org');
    });

    it('should support withParameters for batch vendor params', () => {
      const bp = bpFactory.create(BASE_COMPONENT);
      const c = factory
        .satisfy(bp)
        .withParameters({bucket: 'events', orgId: 'org-a'})
        .build();

      expect(c.parameters.getOptionalFieldByName('bucket')).toBe('events');
      expect(c.parameters.getOptionalFieldByName('orgId')).toBe('org-a');
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'dep-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Dep VPC',
      });
      const bp = bpFactory.create({
        ...BASE_COMPONENT,
        dependencies: [{id: vpc.id}],
      });
      const c = factory.satisfy(bp).build();

      expect(c.dependencies).toHaveLength(1);
      expect(c.dependencies[0].id.toString()).toBe('dep-vpc');
    });

    it('should carry links from blueprint', () => {
      const other = bpFactory.create({
        id: 'other-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Other DB',
      });
      const bp = bpFactory.create({
        ...BASE_COMPONENT,
        links: [
          {
            id: other.id,
            parameters: other.parameters,
          },
        ],
      });
      const c = factory.satisfy(bp).build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('other-db');
    });
  });
});

// ── Backward compatibility ────────────────────────────────────────────────────

describe('backward compatibility', () => {
  it('InfrastructureDomain known values still work', () => {
    expect(InfrastructureDomain.Storage).toBe('Storage');
    expect(InfrastructureDomain.NetworkAndCompute).toBe('NetworkAndCompute');
    expect(InfrastructureDomain.BigData).toBe('BigData');
    expect(InfrastructureDomain.ApiManagement).toBe('APIManagement');
  });

  it('ServiceDeliveryModel known values still work', () => {
    expect(ServiceDeliveryModel.PaaS).toBe('PaaS');
    expect(ServiceDeliveryModel.IaaS).toBe('IaaS');
    expect(ServiceDeliveryModel.CaaS).toBe('CaaS');
    expect(ServiceDeliveryModel.FaaS).toBe('FaaS');
    expect(ServiceDeliveryModel.SaaS).toBe('SaaS');
  });

  it('built-in helpers still produce correct type strings', () => {
    const {vpc} = VirtualNetwork.create({
      id: 'compat-vpc',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'Compat VPC',
      cidrBlock: '10.0.0.0/16',
    });
    expect(vpc.type.toString()).toBe(
      'NetworkAndCompute.IaaS.VirtualNetwork',
    );
  });

  it('Custom.offer with built-in provider string works', () => {
    const factory = Custom.offer({
      domain: InfrastructureDomain.Storage,
      serviceDeliveryModel: ServiceDeliveryModel.PaaS,
      name: 'CustomS3',
      provider: 'AWS',
    });
    const c = factory.create({
      id: 'my-bucket',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'My Bucket',
    });
    expect(c.provider).toBe('AWS');
    expect(c.type.toString()).toBe('Storage.PaaS.CustomS3');
  });
});
