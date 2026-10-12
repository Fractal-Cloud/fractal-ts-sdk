/**
 * offers/security.ts — Security domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Security Component each
 * satisfies. Vendor knobs live in each offer's config only. Vendor-neutral
 * self-hosted offers (e.g. Ocelot / Keycloak on any cluster) omit `provider`.
 */
import {unsupported} from './neutral_rules';
import {
  Security_CaaS_CertManager,
  Security_CaaS_Ocelot,
  Security_PaaS_AwsCognito,
  Security_PaaS_AzureEntraExternalId,
} from './generated/security';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';
import type {CertManagerConfig} from './cert_manager_config';

// ── Security.ServiceMesh offers ──────────────────────────────────────────────
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
export const Ocelot = defineOffer<
  'Security.ServiceMesh',
  ContractConfig<typeof Security_CaaS_Ocelot>
>({
  satisfies: 'Security.ServiceMesh',
  contract: Security_CaaS_Ocelot,
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
  ContractConfig<
    typeof Security_PaaS_AzureEntraExternalId,
    | 'mfaConfiguration'
    | 'passwordPolicy'
    | 'sessionDuration'
    | 'userDirectoryName'
  >
>({
  satisfies: 'Security.IdentityProvider',
  contract: Security_PaaS_AzureEntraExternalId,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
  },
});

/**
 * cert-manager on a Kubernetes cluster (EKS), installed and owned by the
 * caas-k8s agent (jetstack chart v1.21.2, pinned), with a Let's Encrypt
 * ClusterIssuer that solves DNS-01 in Route 53 by assuming `role`. Vendor-neutral
 * self-hosted, so no `provider`.
 *
 * Output fields: `namespace`, `releaseName`, `chartVersion`, `clusterIssuerName`,
 * `acmeServer` (the directory URL), `hostedZoneId`, `role`, `serviceAccountName`
 * (`cert-manager`), `podIdentityRoleArn`, `podIdentityAssociationId`,
 * `workloadRoleName`, `workloadRoleArn`, `workloadRoleDrift`.
 */
export const CertManager = defineOffer<
  'Security.CertificateManager',
  CertManagerConfig
>({
  satisfies: 'Security.CertificateManager',
  contract: Security_CaaS_CertManager,
  deliveryModel: 'CaaS',
});
