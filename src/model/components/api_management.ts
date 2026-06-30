/**
 * components/api_management.ts — APIManagement Component factories.
 *
 * Each agnostic blueprint parameter is a typed `.withXxx()` guardrail setter
 * (locked at design time). Vendor knobs do NOT live here — they belong on
 * Offers (see offers/api_management.ts).
 */
import {ComponentNode, NodeState, newNode, guardrail} from '../core';

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
});
export const ApiGateway = <const Id extends string>(cfg: {
  id: Id;
}): ApiGatewayNode<Id> =>
  apiGatewayNode<Id>(newNode(cfg.id, 'APIManagement.ApiGateway'));
