/**
 * offers/unmanaged.ts — Unmanaged (SaaS / external) Offers (Catalogue, Level 3).
 *
 * Per-domain concrete offers for the generic `Unmanaged` component. Each is
 * vendor-neutral (an external third party — no cloud `provider`). The service's
 * secret (e.g. an API key) is NOT carried inline: it references an environment
 * secret by short name via `secretRef(...)`, and the agent resolves it from the
 * environment secret store, exposing only a reference downstream. Additional
 * domains (Storage.SaaS.Unmanaged, ...) are added here the same way, all
 * satisfying the single `Unmanaged` component.
 */
import {defineOffer} from '../core';
import type {SecretRef} from '../secret';

/**
 * Config for an Unmanaged offer. `secret` references an environment secret (by
 * short name, via `secretRef('...')`) holding the external service's key — the
 * raw value never travels in the blueprint. Define the secret once on the
 * environment with `withSecret({shortName, value})`.
 */
type UnmanagedConfig = {secret: SecretRef};

// ── AI.SaaS.Unmanaged — external AI / LLM service (e.g. OpenAI) ───────────────
export const UnmanagedAi = defineOffer<'Unmanaged', UnmanagedConfig>({
  satisfies: 'Unmanaged',
  offerType: 'AI.SaaS.Unmanaged',
  deliveryModel: 'SaaS',
});
