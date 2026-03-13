import {describe, expect, it} from 'vitest';
import {Traefik} from './traefik';
import {CaaSApiGateway} from '../../../../fractal/component/api_management/caas/api_gateway';

const BASE_CONFIG = {
  id: 'my-traefik',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Traefik',
};

describe('Traefik', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Traefik.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.CaaS.Traefik');
    });

    it('should set provider to CaaS', () => {
      const c = Traefik.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const entryPoints = [{name: 'web', port: 80}];
      const tlsCerts = [{certFile: '/path/to/cert'}];
      const tlsSettings = {minVersion: 'VersionTLS12'};
      const secHeaders = {contentTypeNosniff: true};

      const c = Traefik.create({
        ...BASE_CONFIG,
        namespace: 'traefik',
        hostname: 'traefik.example.com',
        loadbalancerIp: '10.0.0.1',
        oidcClientId: 'client-123',
        oidcClientSecretId: 'secret-456',
        forwardAuthSecretId: 'auth-789',
        oidcIssuerUrl: 'https://issuer.example.com',
        entryPoints,
        tlsCertificates: tlsCerts,
        tlsSettings,
        securityHeadersSettings: secHeaders,
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'traefik'
      );
      expect(c.parameters.getOptionalFieldByName('hostname')).toBe(
        'traefik.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('loadbalancerIp')).toBe(
        '10.0.0.1'
      );
      expect(c.parameters.getOptionalFieldByName('oidcClientId')).toBe(
        'client-123'
      );
      expect(c.parameters.getOptionalFieldByName('oidcClientSecretId')).toBe(
        'secret-456'
      );
      expect(c.parameters.getOptionalFieldByName('forwardAuthSecretId')).toBe(
        'auth-789'
      );
      expect(c.parameters.getOptionalFieldByName('oidcIssuerUrl')).toBe(
        'https://issuer.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('entryPoints')).toEqual(
        entryPoints
      );
      expect(c.parameters.getOptionalFieldByName('tlsCertificates')).toEqual(
        tlsCerts
      );
      expect(c.parameters.getOptionalFieldByName('tlsSettings')).toEqual(
        tlsSettings
      );
      expect(
        c.parameters.getOptionalFieldByName('securityHeadersSettings')
      ).toEqual(secHeaders);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = CaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Gateway',
      });

      const c = Traefik.satisfy(bp.component).build();

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

      const c = Traefik.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = CaaSApiGateway.create({
        id: 'bp-gateway',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gateway',
      });

      const entryPoints = [{name: 'websecure', port: 443}];
      const tlsSettings = {minVersion: 'VersionTLS13'};

      const c = Traefik.satisfy(bp.component)
        .withNamespace('prod')
        .withHostname('prod.example.com')
        .withLoadbalancerIp('10.0.1.1')
        .withOidcClientId('prod-client')
        .withOidcClientSecretId('prod-secret')
        .withForwardAuthSecretId('prod-auth')
        .withOidcIssuerUrl('https://prod-issuer.example.com')
        .withEntryPoints(entryPoints)
        .withTlsCertificates([])
        .withTlsSettings(tlsSettings)
        .withSecurityHeadersSettings({frameDeny: true})
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('hostname')).toBe(
        'prod.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('loadbalancerIp')).toBe(
        '10.0.1.1'
      );
      expect(c.parameters.getOptionalFieldByName('oidcClientId')).toBe(
        'prod-client'
      );
      expect(c.parameters.getOptionalFieldByName('oidcClientSecretId')).toBe(
        'prod-secret'
      );
      expect(c.parameters.getOptionalFieldByName('forwardAuthSecretId')).toBe(
        'prod-auth'
      );
      expect(c.parameters.getOptionalFieldByName('oidcIssuerUrl')).toBe(
        'https://prod-issuer.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('entryPoints')).toEqual(
        entryPoints
      );
      expect(c.parameters.getOptionalFieldByName('tlsCertificates')).toEqual(
        []
      );
      expect(c.parameters.getOptionalFieldByName('tlsSettings')).toEqual(
        tlsSettings
      );
      expect(
        c.parameters.getOptionalFieldByName('securityHeadersSettings')
      ).toEqual({frameDeny: true});
    });
  });
});
