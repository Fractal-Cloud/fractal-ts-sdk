import {describe, expect, it} from 'vitest';
import {GcpApiGateway} from './gcp_api_gateway';
import {PaaSApiGateway} from '../../../../fractal/component/api_management/paas/api_gateway';

const BASE_CONFIG = {
  id: 'my-gateway',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My API Gateway',
};

describe('GcpApiGateway', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpApiGateway.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.PaaS.ApiGateway');
    });

    it('should set provider to GCP', () => {
      const c = GcpApiGateway.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set vendor-specific parameters', () => {
      const c = GcpApiGateway.create({
        ...BASE_CONFIG,
        region: 'us-central1',
        name: 'prod-gateway',
        apiId: 'my-api',
        apiConfigId: 'config-v1',
      });
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
      expect(c.parameters.getOptionalFieldByName('name')).toBe(
        'prod-gateway'
      );
      expect(c.parameters.getOptionalFieldByName('apiId')).toBe('my-api');
      expect(c.parameters.getOptionalFieldByName('apiConfigId')).toBe(
        'config-v1'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Gateway',
      });

      const c = GcpApiGateway.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-gateway');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Gateway');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gateway',
      });

      const c = GcpApiGateway.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gateway',
      });

      const c = GcpApiGateway.satisfy(bp.component)
        .withRegion('europe-west1')
        .withName('eu-gateway')
        .withApiId('eu-api')
        .withApiConfigId('config-v2')
        .build();

      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'europe-west1'
      );
      expect(c.parameters.getOptionalFieldByName('name')).toBe(
        'eu-gateway'
      );
      expect(c.parameters.getOptionalFieldByName('apiId')).toBe('eu-api');
      expect(c.parameters.getOptionalFieldByName('apiConfigId')).toBe(
        'config-v2'
      );
    });
  });
});
