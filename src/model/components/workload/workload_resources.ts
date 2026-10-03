import type {ResourceQuantities} from './resource_quantities';

/** What a workload's container is guaranteed (`requests`) and capped at (`limits`). */
export type WorkloadResources = {
  requests?: ResourceQuantities;
  limits?: ResourceQuantities;
};
