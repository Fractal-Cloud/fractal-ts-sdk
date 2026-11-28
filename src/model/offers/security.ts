/**
 * offers/security.ts — Security domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Security Component each
 * satisfies. Vendor knobs live in each offer's config only. Vendor-neutral
 * self-hosted offers (e.g. Ocelot / Keycloak on any cluster) omit `provider`.
 */
import {unsupported} from './neutral_rules';
import {
  Security_PaaS_AwsCognito,
  Security_PaaS_AzureEntraExternalId,
} from './generated/security';
import type {Security_CaaS_Ocelot} from './retired/security_caas_ocelot';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';

// ── Security.ServiceMesh offers ──────────────────────────────────────────────
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
/**
 * @deprecated No agent serves a customer `Security.CaaS.Ocelot` any more:
 * fractal-cloud-agents v8.48.0 keeps it for the bootstrap Live System only,
 * and aria-agent-caas-k8s (v2.1.0) does not serve it yet. A Live System using
 * it is stored but never reconciled. There is no replacement offer until
 * caas-k8s serves Ocelot; it then returns, defined from that agent's contract.
 */
export const Ocelot = defineOffer<
  'Security.ServiceMesh',
  ContractConfig<typeof Security_CaaS_Ocelot>
>({
  satisfies: 'Security.ServiceMesh',
  offerType: 'Security.CaaS.Ocelot',
  deliveryModel: 'CaaS',
  neutral: {
    authenticationMode: unsupported(
      'the agent has no authentication mode setting',
    ),
    mtlsMode: unsupported('the agent configures no mTLS'),
    tags: unsupported('the agent applies no tags to it'),
  },
});

// ── Security.IdentityProvider offers ─────────────────────────────────────────
export const Cognito = defineOffer<
  'Security.IdentityProvider',
  ContractConfig<
    typeof Security_PaaS_AwsCognito,
    | 'mfaConfiguration'
    | 'passwordPolicy'
    | 'sessionDuration'
    | 'userDirectoryName'
  >
>({
  satisfies: 'Security.IdentityProvider',
  contract: Security_PaaS_AwsCognito,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
  },
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
// Microsoft Entra External ID (formerly Azure AD B2C) — the Azure competitor to
// Cognito. Vendor plumbing only (tenant + resource group + optional region);
// guardrails come from the IdentityProvider Component, app clients from links.
export const EntraExternalId = defineOffer<
  'Security.IdentityProvider',
  ContractConfig<typeof Security_PaaS_AzureEntraExternalId, 'mfaConfiguration'>
>({
  satisfies: 'Security.IdentityProvider',
  contract: Security_PaaS_AzureEntraExternalId,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
    passwordPolicy: unsupported('the agent sets no password policy'),
    sessionDuration: unsupported('the agent sets no session duration'),
    userDirectoryName: unsupported(
      'the tenant is named by tenantName, not the directory guardrail',
    ),
  },
});
