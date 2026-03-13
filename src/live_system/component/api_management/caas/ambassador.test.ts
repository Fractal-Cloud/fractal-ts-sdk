import {describe, expect, it} from 'vitest';
import {Ambassador} from './ambassador';
import {CaaSApiGateway} from '../../../../fractal/component/api_management/caas/api_gateway';

const BASE_CONFIG = {
  id: 'my-ambassador',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Ambassador',
};

describe('Ambassador', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Ambassador.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.CaaS.Ambassador');
    });

    it('should set provider to CaaS', () => {
      const c = Ambassador.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Ambassador.create({
        ...BASE_CONFIG,
        namespace: 'ambassador',
        host: 'api.example.com',
        hostOwnerEmail: 'admin@example.com',
        acmeProviderAuthority: 'https://acme.example.com',
        tlsSecretName: 'ambassador-tls',
        licenseKey: 'license-123',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'ambassador'
      );
      expect(c.parameters.getOptionalFieldByName('host')).toBe(
        'api.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('hostOwnerEmail')).toBe(
        'admin@example.com'
      );
      expect(
        c.parameters.getOptionalFieldByName('acmeProviderAuthority')
      ).toBe('https://acme.example.com');
      expect(c.parameters.getOptionalFieldByName('tlsSecretName')).toBe(
        'ambassador-tls'
      );
      expect(c.parameters.getOptionalFieldByName('licenseKey')).toBe(
        'license-123'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = CaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Gateway',
      });

      const c = Ambassador.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-gateway');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Gateway');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = CaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gateway',
      });

      const c = Ambassador.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = CaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gateway',
      });

      const c = Ambassador.satisfy(bp.component)
        .withNamespace('prod')
        .withHost('prod.example.com')
        .withHostOwnerEmail('ops@example.com')
        .withAcmeProviderAuthority('https://acme.prod.com')
        .withTlsSecretName('prod-tls')
        .withLicenseKey('prod-license')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('host')).toBe(
        'prod.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('hostOwnerEmail')).toBe(
        'ops@example.com'
      );
      expect(
        c.parameters.getOptionalFieldByName('acmeProviderAuthority')
      ).toBe('https://acme.prod.com');
      expect(c.parameters.getOptionalFieldByName('tlsSecretName')).toBe(
        'prod-tls'
      );
      expect(c.parameters.getOptionalFieldByName('licenseKey')).toBe(
        'prod-license'
      );
    });
  });
});
