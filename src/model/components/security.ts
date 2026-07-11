/**
 * components/security.ts — Security domain Component factories (Level 1).
 *
 * Abstract, vendor-agnostic capability contracts:
 *   - Security.ServiceMesh
 *   - Security.IdentityProvider
 *
 * Each agnostic parameter is a typed `.withXxx()` guardrail setter (locks the
 * key at design time). Built exclusively on the LOCKED engine in ../core.
 */
import {ComponentNode, NodeState, newNode, guardrail} from '../core';

// ── Security.ServiceMesh ─────────────────────────────────────────────────────
export type ServiceMeshNode<Id extends string = string> = ComponentNode<
  Id,
  'Security.ServiceMesh'
> & {
  withMtlsMode: (v: 'off' | 'permissive' | 'strict') => ServiceMeshNode<Id>;
  withAuthenticationMode: (v: string) => ServiceMeshNode<Id>;
  withTags: (v: Record<string, string>) => ServiceMeshNode<Id>;
};
const serviceMeshNode = <Id extends string>(
  s: NodeState,
): ServiceMeshNode<Id> => ({
  state: s,
  withMtlsMode: v => serviceMeshNode<Id>(guardrail(s, 'mtlsMode', v)),
  withAuthenticationMode: v =>
    serviceMeshNode<Id>(guardrail(s, 'authenticationMode', v)),
  withTags: v => serviceMeshNode<Id>(guardrail(s, 'tags', v)),
});
export const ServiceMesh = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): ServiceMeshNode<Id> =>
  serviceMeshNode<Id>(newNode(cfg.id, 'Security.ServiceMesh', cfg.displayName));

// ── Security.IdentityProvider ────────────────────────────────────────────────
export type IdentityProviderNode<Id extends string = string> = ComponentNode<
  Id,
  'Security.IdentityProvider'
> & {
  withUserDirectoryName: (v: string) => IdentityProviderNode<Id>;
  withPasswordPolicy: (v: {minLength: number}) => IdentityProviderNode<Id>;
  withMfaConfiguration: (
    v: 'OFF' | 'OPTIONAL' | 'ON',
  ) => IdentityProviderNode<Id>;
  withSessionDuration: (v: number) => IdentityProviderNode<Id>;
  withTags: (v: Record<string, string>) => IdentityProviderNode<Id>;
};
const identityProviderNode = <Id extends string>(
  s: NodeState,
): IdentityProviderNode<Id> => ({
  state: s,
  withUserDirectoryName: v =>
    identityProviderNode<Id>(guardrail(s, 'userDirectoryName', v)),
  withPasswordPolicy: v =>
    identityProviderNode<Id>(guardrail(s, 'passwordPolicy', v)),
  withMfaConfiguration: v =>
    identityProviderNode<Id>(guardrail(s, 'mfaConfiguration', v)),
  withSessionDuration: v =>
    identityProviderNode<Id>(guardrail(s, 'sessionDuration', v)),
  withTags: v => identityProviderNode<Id>(guardrail(s, 'tags', v)),
});
export const IdentityProvider = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): IdentityProviderNode<Id> =>
  identityProviderNode<Id>(
    newNode(cfg.id, 'Security.IdentityProvider', cfg.displayName),
  );
