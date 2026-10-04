/**
 * Vendor knobs of the `CertManager` offer (`Security.CaaS.CertManager`), under
 * the keys the caas-k8s agent declares in its catalog `Config`. The cert-manager
 * chart version is pinned by the agent (v1.21.2) and is not a parameter.
 */
export type CertManagerConfig = {
  /** Route 53 hosted zone id (`Z...`) the DNS-01 challenge records are written to. Required. */
  hostedZoneId: string;
  /**
   * ARN of the zone role cert-manager assumes (`arn:aws:iam::<account>:role/...`),
   * usually in the zone's account. Required. cert-manager's own Pod Identity role
   * may do nothing but `sts:AssumeRole` on it.
   */
  role: string;
  /** ACME account email. Required. */
  email: string;
  /**
   * `production` (the agent default), `staging` (Let's Encrypt's directories) or
   * an `https://` ACME directory URL.
   */
  acmeServer?: 'production' | 'staging' | `https://${string}`;
  /**
   * Name of the ClusterIssuer; the agent defaults to `letsencrypt`. A
   * `TraefikGateway` names it in `tlsClusterIssuer`.
   */
  clusterIssuerName?: string;
  /** Namespace cert-manager is installed in; the agent defaults to `cert-manager`. */
  namespace?: string;
};
