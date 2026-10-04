/**
 * offers/security.ts — Security domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Security Component each
 * satisfies. Vendor knobs live in each offer's config only. Vendor-neutral
 * self-hosted offers (e.g. Ocelot / Keycloak on any cluster) omit `provider`.
 */
import {defineOffer} from '../core';
import {
  ensureNamespace,
  hasMalformedEscape,
  isKubernetesName,
  refuse,
} from './caas_param_checks';
import type {CertManagerConfig} from './cert_manager_config';

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
export const Cognito = defineOffer<
  'Security.IdentityProvider',
  {region?: string}
>({
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
// Microsoft Entra External ID (formerly Azure AD B2C) — the Azure competitor to
// Cognito. Vendor plumbing only (tenant + resource group + optional region);
// guardrails come from the IdentityProvider Component, app clients from links.
export const EntraExternalId = defineOffer<
  'Security.IdentityProvider',
  {tenantName: string; resourceGroup: string; region?: string}
>({
  satisfies: 'Security.IdentityProvider',
  offerType: 'Security.PaaS.AzureEntraExternalId',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});

// ── Security.CertificateManager offers ───────────────────────────────────────
/** A Route 53 hosted zone id, as the agent reads it. */
const HOSTED_ZONE_ID = /^Z[A-Z0-9]{1,31}$/;
/** An IAM role ARN, as the agent reads it. */
const IAM_ROLE_ARN = /^arn:aws[a-z-]*:iam::[0-9]{12}:role\/[\w+=,.@/-]{1,512}$/;
/** One dot-separated atom of an address, as `net/mail` reads one. */
const ATOM = '[^\\s@<>()[\\]\\\\,;:".]+';
/**
 * A bare address `net/mail` reads back unchanged: dot-separated atoms on both
 * sides, with no display name, comment, angle brackets or empty atom.
 */
const EMAIL = new RegExp(`^${ATOM}(\\.${ATOM})*@${ATOM}(\\.${ATOM})*$`);

const isAcmeServer = (value: string): boolean =>
  ['production', 'staging'].includes(value.trim().toLowerCase()) ||
  (/^https:\/\/[^\s/?#]+([/?#]\S*)?$/i.test(value.trim()) &&
    !hasMalformedEscape(value));

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
  offerType: 'Security.CaaS.CertManager',
  deliveryModel: 'CaaS',
  // The agent trims each value before reading it, so the checks do too.
  validate: (self, _all, config) => {
    if (!HOSTED_ZONE_ID.test(config.hostedZoneId.trim())) {
      refuse(
        self.id,
        `hostedZoneId '${config.hostedZoneId}' is not a Route 53 hosted zone id (Z followed by letters and digits)`,
      );
    }
    if (!IAM_ROLE_ARN.test(config.role.trim())) {
      refuse(self.id, `role '${config.role}' is not an IAM role ARN`);
    }
    if (!EMAIL.test(config.email.trim())) {
      refuse(self.id, `email '${config.email}' is not an email address`);
    }
    if (config.acmeServer !== undefined && !isAcmeServer(config.acmeServer)) {
      refuse(
        self.id,
        `acmeServer '${config.acmeServer}' is neither production, staging nor an https ACME directory URL`,
      );
    }
    if (
      config.clusterIssuerName !== undefined &&
      !isKubernetesName(config.clusterIssuerName.trim())
    ) {
      refuse(
        self.id,
        `clusterIssuerName '${config.clusterIssuerName}' is not a Kubernetes name`,
      );
    }
    ensureNamespace(self.id, config.namespace);
  },
});
