/**
 * A custom EKS Auto Mode NodePool. Each list narrows what Karpenter may launch;
 * an omitted list leaves that dimension to EKS Auto Mode's own defaults.
 */
export type EksAutoModeNodePool = {
  name: string;
  /** `arm64` (Graviton) and/or `amd64`. */
  architectures?: readonly ('arm64' | 'amd64')[];
  /** EC2 instance families, e.g. `m7g`, `c7g`. */
  instanceFamilies?: readonly string[];
  /** `on-demand` and/or `spot`. */
  capacityTypes?: readonly ('on-demand' | 'spot')[];
  /** EC2 instance sizes, e.g. `large`, `xlarge`. */
  instanceSizes?: readonly string[];
};
