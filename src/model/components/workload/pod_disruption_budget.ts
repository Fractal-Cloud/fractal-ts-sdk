/**
 * How many replicas must stay up through a voluntary disruption (a node drain,
 * an upgrade). The agent applies `minAvailable: 1` by default when there is
 * more than one replica.
 */
export type PodDisruptionBudget = {
  minAvailable: number;
};
