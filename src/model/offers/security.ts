/**
 * offers/security.ts — Security domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Security Component each
 * satisfies. Vendor knobs live in each offer's config only. Vendor-neutral
 * self-hosted offers (e.g. Ocelot / Keycloak on any cluster) omit `provider`.
 */
import {defineOffer} from '../core';

// ── Security.ServiceMesh offers ──────────────────────────────────────────────
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
export const Ocelot = defineOffer<'Security.ServiceMesh', {namespace?: string}>(
  {
    satisfies: 'Security.ServiceMesh',
    offerType: 'Security.CaaS.Ocelot',
    deliveryModel: 'CaaS',
  },
);

// ── Security.IdentityProvider offers ─────────────────────────────────────────
export const Cognito = defineOffer<'Security.IdentityProvider', {}>({
  satisfies: 'Security.IdentityProvider',
  offerType: 'Security.PaaS.AwsCognito',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
export const Keycloak = defineOffer<
  'Security.IdentityProvider',
  {namespace?: string}
>({
  satisfies: 'Security.IdentityProvider',
  offerType: 'Security.CaaS.Keycloak',
  deliveryModel: 'CaaS',
});
