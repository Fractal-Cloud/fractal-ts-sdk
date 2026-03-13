/**
 * basic_security.test.ts
 *
 * Integration tests for the basic_security sample pattern.
 * Verifies the blueprint builds correctly and the CaaS live system
 * maps components with the right types, dependencies, and parameters.
 */

import {describe, expect, it} from 'vitest';
import {ServiceMesh} from '../fractal/component/security/caas/service_mesh';
import {Ocelot} from '../live_system/component/security/caas/ocelot';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const serviceMesh = ServiceMesh.create({
  id: 'service-mesh',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Service Mesh',
});

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_security blueprint', () => {
  it('should create ServiceMesh with correct type', () => {
    expect(serviceMesh.component.type.toString()).toBe(
      'Security.CaaS.ServiceMeshsecurity',
    );
    expect(serviceMesh.component.id.toString()).toBe('service-mesh');
    expect(serviceMesh.component.displayName).toBe('Service Mesh');
  });

  it('should include service mesh in components array', () => {
    expect(serviceMesh.components).toHaveLength(1);
    expect(serviceMesh.components[0]).toBe(serviceMesh.component);
  });
});

// ── CaaS live system tests ──────────────────────────────────────────────────

describe('basic_security CaaS live system', () => {
  it('should satisfy ServiceMesh with Ocelot', () => {
    const ocelot = Ocelot.satisfy(serviceMesh.component)
      .withNamespace('ocelot')
      .withHost('app.example.com')
      .withHostOwnerEmail('admin@example.com')
      .withCorsOrigins('https://app.example.com')
      .withCookieMaxAgeSec(3600)
      .build();

    expect(ocelot.type.toString()).toBe('Security.CaaS.Ocelot');
    expect(ocelot.provider).toBe('CaaS');
    expect(ocelot.id.toString()).toBe('service-mesh');
    expect(ocelot.displayName).toBe('Service Mesh');
    expect(ocelot.parameters.getOptionalFieldByName('namespace')).toBe(
      'ocelot',
    );
    expect(ocelot.parameters.getOptionalFieldByName('host')).toBe(
      'app.example.com',
    );
    expect(ocelot.parameters.getOptionalFieldByName('hostOwnerEmail')).toBe(
      'admin@example.com',
    );
    expect(ocelot.parameters.getOptionalFieldByName('corsOrigins')).toBe(
      'https://app.example.com',
    );
    expect(ocelot.parameters.getOptionalFieldByName('cookieMaxAgeSec')).toBe(
      3600,
    );
  });
});
