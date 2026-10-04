/**
 * components/certificate_manager.ts — the Security.CertificateManager Component (Level 1).
 *
 * Abstract capability contract: something that issues and renews TLS
 * certificates on a container platform (e.g. cert-manager with an ACME issuer).
 * It has no agnostic parameters: what to issue from, and how to prove control of
 * a domain, is vendor plumbing on the offer (see `CertManager`).
 */
import {ComponentNode, newNode} from '../core';

export type CertificateManagerNode<Id extends string = string> = ComponentNode<
  Id,
  'Security.CertificateManager'
>;

export const CertificateManager = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): CertificateManagerNode<Id> => ({
  state: newNode(cfg.id, 'Security.CertificateManager', cfg.displayName),
});
