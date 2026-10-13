/**
 * Vendor-neutral load balancer exposure: reachable only from inside the network
 * (`internal`) or from the internet (`internet-facing`). Each LoadBalancer offer
 * translates it to the key and spelling its own agent reads.
 */
export type LoadBalancerScheme = 'internal' | 'internet-facing';
