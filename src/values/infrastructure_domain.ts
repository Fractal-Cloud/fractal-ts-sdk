/**
 * Known infrastructure domains that categorize components or services
 * within an infrastructure system.
 *
 * This is an open type — custom aria agents may define additional domains
 * beyond the built-in set. Any string is accepted where an
 * `InfrastructureDomain` is expected; the known values provide
 * autocomplete convenience.
 */
export const InfrastructureDomain = {
  ApiManagement: 'APIManagement',
  BigData: 'BigData',
  NetworkAndCompute: 'NetworkAndCompute',
  CustomWorkloads: 'CustomWorkloads',
  Messaging: 'Messaging',
  Storage: 'Storage',
  Observability: 'Observability',
  Security: 'Security',
} as const;

/**
 * Any of the built-in infrastructure domain values, or a custom string
 * for domains defined by custom aria agents.
 */
export type InfrastructureDomain =
  | (typeof InfrastructureDomain)[keyof typeof InfrastructureDomain]
  | (string & {});
