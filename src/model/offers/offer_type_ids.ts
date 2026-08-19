/**
 * Offer type ids that more than one offer module has to agree on.
 *
 * These strings are a wire contract: the platform catalogue publishes them and
 * the agent that claims the component keys its handler registry on them with a
 * plain map lookup. A component whose type matches no registered handler is
 * skipped in silence — it never deploys and the Live System never settles. The
 * ids live here, once, because a literal duplicated across offer modules is how
 * half a rename ships: one file changes and the other keeps the old value.
 *
 * Not re-exported from the model barrel — these are internal, not public API.
 */
export const KUBERNETES_WORKLOAD_OFFER_TYPE =
  'CustomWorkloads.CaaS.KubernetesWorkload';
