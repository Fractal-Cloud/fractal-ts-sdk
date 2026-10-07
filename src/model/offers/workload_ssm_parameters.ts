/**
 * Parameter Store access for a Kubernetes workload on EKS: the workload's Pod
 * Identity role may read (and with `read-write`, put) the parameters under
 * `/fractal/<service>`.
 */
export type WorkloadSsmParameters = {
  /** One path segment: the parameters live under `/fractal/<service>`. */
  service: string;
  access: 'read' | 'read-write';
  /**
   * The customer-managed KMS key (by key ARN, never an alias) the SecureStrings
   * are encrypted with. Omit for the AWS-managed `aws/ssm` key.
   */
  kmsKeyArn?: string;
};
