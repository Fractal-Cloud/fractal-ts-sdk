import {describe, expect, it} from 'vitest';
import {Ocelot} from './ocelot';
import {ServiceMesh} from '../../../../fractal/component/security/caas/service_mesh';

const BASE_CONFIG = {
  id: 'my-ocelot',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Ocelot',
};

describe('Ocelot', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Ocelot.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Security.CaaS.Ocelot');
    });

    it('should set provider to CaaS', () => {
      const c = Ocelot.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Ocelot.create({
        ...BASE_CONFIG,
        namespace: 'ocelot',
        cookieMaxAgeSec: 3600,
        corsOrigins: 'https://example.com',
        hostOwnerEmail: 'admin@example.com',
        host: 'api.example.com',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'ocelot'
      );
      expect(c.parameters.getOptionalFieldByName('cookieMaxAgeSec')).toBe(
        3600
      );
      expect(c.parameters.getOptionalFieldByName('corsOrigins')).toBe(
        'https://example.com'
      );
      expect(c.parameters.getOptionalFieldByName('hostOwnerEmail')).toBe(
        'admin@example.com'
      );
      expect(c.parameters.getOptionalFieldByName('host')).toBe(
        'api.example.com'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = ServiceMesh.create({
        id: 'bp-mesh',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Mesh',
      });

      const c = Ocelot.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-mesh');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Mesh');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = ServiceMesh.create({
        id: 'bp-mesh',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Mesh',
      });

      const c = Ocelot.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = ServiceMesh.create({
        id: 'bp-mesh',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Mesh',
      });

      const c = Ocelot.satisfy(bp.component)
        .withNamespace('prod')
        .withCookieMaxAgeSec(7200)
        .withCorsOrigins('https://prod.example.com')
        .withHostOwnerEmail('ops@example.com')
        .withHost('prod.example.com')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('cookieMaxAgeSec')).toBe(
        7200
      );
      expect(c.parameters.getOptionalFieldByName('corsOrigins')).toBe(
        'https://prod.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('hostOwnerEmail')).toBe(
        'ops@example.com'
      );
      expect(c.parameters.getOptionalFieldByName('host')).toBe(
        'prod.example.com'
      );
    });
  });
});
