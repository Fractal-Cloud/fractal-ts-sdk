/**
 * Enumeration representing various infrastructure domains.
 * These domains categorize components or services
 * within an infrastructure system.
 *
 * @enum {string}
 * @property {string} ApiManagement - Represents API management-related components.
 * @property {string} NetworkAndCompute - Represents network and compute components.
 * @property {string} CustomWorkloads - Represents custom workload components.
 * @property {string} Messaging - Represents messaging and communication components.
 * @property {string} Storage - Represents data storage components.
 * @property {string} Observability - Represents observability tools and monitoring components.
 * @property {string} Security - Represents security-focused components.
 */
export enum InfrastructureDomain {
  ApiManagement = 'APIManagement',
  NetworkAndCompute = 'NetworkAndCompute',
  CustomWorkloads = 'CustomWorkloads',
  Messaging = 'Messaging',
  Storage = 'Storage',
  Observability = 'Observability',
  Security = 'Security',
}
