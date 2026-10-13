/**
 * components/api_management.ts — APIManagement Component factories.
 *
 * Each agnostic blueprint parameter is a typed `.withXxx()` guardrail setter
 * (locked at design time). Vendor knobs do NOT live here — they belong on
 * Offers (see offers/api_management.ts).
 */
import {
  ComponentNode,
  NodeState,
  newNode,
  guardrail,
  AnyNode,
  addDependency,
} from '../core';
import type {DnsZoneAccessRequest} from './dns_zone_access_request';
import {withDnsZonesParameter} from './dns_zones_parameter';

// ── Shared value types ───────────────────────────────────────────────────────
export type Route = {
  path: string;
  methods?: string[];
  upstream?: string;
};

// ── ApiGateway ───────────────────────────────────────────────────────────────
export type ApiGatewayNode<Id extends string = string> = ComponentNode<
  Id,
  'APIManagement.ApiGateway'
> & {
  withHttpsOnly: (v: boolean) => ApiGatewayNode<Id>;
  withCustomDomain: (v: string) => ApiGatewayNode<Id>;
  withCors: (v: {allowOrigins: string[]}) => ApiGatewayNode<Id>;
  withRateLimit: (v: {requestsPerSecond: number}) => ApiGatewayNode<Id>;
  withRoutes: (v: Route[]) => ApiGatewayNode<Id>;
  /**
   * Ask for access to environment DNS zones, e.g. `[{name: 'example.com',
   * access: {TXT: 'write'}}]`: the control plane grants the component's own
   * identity that access, cut down to each zone's `componentAccess` ceiling, and
   * the component writes its records itself. An open default, not a guardrail:
   * the zones depend on the environment, so an operation may change them.
   *
   * A `TraefikGateway` with TXT write on the zone of its hosts issues its own
   * certificate (ACME DNS-01); see its `acmeEmail` and `acmeServer`.
   */
  withDnsZones: (zones: readonly DnsZoneAccessRequest[]) => ApiGatewayNode<Id>;
  /**
   * Declare a structural dependency: e.g. the ContainerPlatform a self-hosted
   * offer is installed on, which its agent requires.
   */
  dependsOn: (other: AnyNode) => ApiGatewayNode<Id>;
};
const apiGatewayNode = <Id extends string>(
  s: NodeState,
): ApiGatewayNode<Id> => ({
  state: s,
  withHttpsOnly: v => apiGatewayNode<Id>(guardrail(s, 'httpsOnly', v)),
  withCustomDomain: v => apiGatewayNode<Id>(guardrail(s, 'customDomain', v)),
  withCors: v => apiGatewayNode<Id>(guardrail(s, 'cors', v)),
  withRateLimit: v => apiGatewayNode<Id>(guardrail(s, 'rateLimit', v)),
  withRoutes: v => apiGatewayNode<Id>(guardrail(s, 'routes', v)),
  withDnsZones: zones => apiGatewayNode<Id>(withDnsZonesParameter(s, zones)),
  dependsOn: other => apiGatewayNode<Id>(addDependency(s, other.state.id)),
});
export const ApiGateway = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): ApiGatewayNode<Id> =>
  apiGatewayNode<Id>(
    newNode(cfg.id, 'APIManagement.ApiGateway', cfg.displayName),
  );
