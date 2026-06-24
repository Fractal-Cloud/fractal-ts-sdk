/**
 * vpn_tunnel_fractal.test.ts
 *
 * Migration proof for the NetworkAndCompute `VpnTunnel` capability on the
 * Fractal + Interface model. Mirrors identity_fractal.test.ts:
 *   - An infra team authors a Fractal whose VpnTunnel abstract component carries
 *     the candidate Offers (ArubaVpnTunnel on Aruba IaaS).
 *   - A dev team specializes ONLY through the Interface, never naming an Offer.
 *   - The Provider chosen at LiveSystem time selects the Offer; the dev's
 *     neutral parameters flow into it unchanged.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 *   - The authored Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No VpnTunnel offer …`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {VpnTunnel} from '../fractal/component/network_and_compute/iaas/vpn_tunnel';
import {ArubaVpnTunnel} from '../live_system/component/network_and_compute/iaas/aruba_vpn_tunnel';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';

// ── fixtures ─────────────────────────────────────────────────────────────────

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();
const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();
const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();
const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
// The VpnTunnel abstract component declares the candidate offers (ArubaVpnTunnel
// on Aruba). The interface exposes vendor-neutral ops only.
function authorVpnTunnelFractal() {
  return createFractal({
    id: 'site-to-site-vpn',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed site-to-site VPN tunnel',
    boundedContextId,
    blueprint: bp => ({
      tunnel: bp.add(
        VpnTunnel.create({
          id: 'tunnel',
          displayName: 'Site-to-site VPN Tunnel',
          offers: [ArubaVpnTunnel],
        }),
      ),
    }),
    operations: bp => ({
      withPeerPublicIp: (ip: string) => bp.tunnel.set('peerPublicIp', ip),
      withPresharedKey: (key: string) => bp.tunnel.set('presharedKey', key),
      withSubnetCidr: (cidr: string) => bp.tunnel.set('subnetCidr', cidr),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specializeAndInstantiate(provider: 'Aruba') {
  const fractal = authorVpnTunnelFractal();

  fractal.operations
    .withPeerPublicIp('203.0.113.1')
    .withPresharedKey('secret-key')
    .withSubnetCidr('10.99.0.0/16');

  // The provider — NOT the dev's specialization code — selects the offer.
  return fractal.toLiveSystem({name: 'acme-vpn', environment, provider});
}

describe('VpnTunnelFractal — provider-driven offer selection', () => {
  const NEUTRAL_KEYS = VpnTunnel.NEUTRAL_KEYS;

  it('selects ArubaVpnTunnel on Aruba from the authored Fractal', () => {
    const aruba = specializeAndInstantiate('Aruba');
    const tunnel = aruba.components.find(c => c.id.toString() === 'tunnel')!;

    expect(tunnel).toBeDefined();
    expect(tunnel.type.toString()).toBe(
      'NetworkAndCompute.IaaS.ArubaVpnTunnel',
    );
    expect(tunnel.provider).toBe('Aruba');
  });

  it('flows the neutral parameters set through the interface into the offer', () => {
    const tunnel = specializeAndInstantiate('Aruba').components.find(
      c => c.id.toString() === 'tunnel',
    )!;

    for (const key of NEUTRAL_KEYS) {
      expect(tunnel.parameters.getOptionalFieldByName(key)).toBeDefined();
    }

    expect(tunnel.parameters.getOptionalFieldByName('peerPublicIp')).toBe(
      '203.0.113.1',
    );
    expect(tunnel.parameters.getOptionalFieldByName('presharedKey')).toBe(
      'secret-key',
    );
    expect(tunnel.parameters.getOptionalFieldByName('subnetCidr')).toBe(
      '10.99.0.0/16',
    );
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specializeAndInstantiate('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('site-to-site-vpn');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Aruba');
  });
});

describe('VpnTunnelFractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorVpnTunnelFractal();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fractal.toLiveSystem({
        name: 'acme-vpn',
        environment,
        provider: 'AWS' as any,
      }),
    ).toThrow(/No VpnTunnel offer/);
  });

  it('returns the interface from every operation for fluent chaining', () => {
    const fractal = authorVpnTunnelFractal();
    const returned = fractal.operations.withPeerPublicIp('203.0.113.1');
    expect(returned).toBe(fractal.operations);
    expect(typeof returned.withSubnetCidr).toBe('function');
  });

  it('serializes the candidate offer onto the Blueprint Service', () => {
    const tunnel = authorVpnTunnelFractal().blueprint.components.find(
      c => c.id.toString() === 'tunnel',
    )!;

    const serviceTypes = (tunnel.services ?? [])
      .map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.IaaS.VpnTunnel']);

    const offerTypes = (tunnel.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['NetworkAndCompute.IaaS.ArubaVpnTunnel']);
  });
});
