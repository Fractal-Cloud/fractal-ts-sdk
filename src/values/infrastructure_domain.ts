/**
 * Represents the various service delivery models available for a system or application.
 * This enum can be used to categorize or define the method of service delivery based
 * on the specific functionalities or domains.
 *
 * @enum {string}
 * @readonly
 * @property {string} ApiManagement - Represents a delivery model related to API management services.
 * @property {string} CustomWorkloads - Represents a custom workload-based delivery model.
 * @property {string} Messaging - Represents a delivery model focused on messaging capabilities.
 * @property {string} Storage - Represents a delivery model related to storage solutions.
 * @property {string} Observability - Represents a delivery model focused on monitoring and observability.
 * @property {string} Security - Represents a delivery model related to security and protection measures.
 */
export enum ServiceDeliveryModel {
  ApiManagement = 'APIManagement',
  CustomWorkloads = 'CustomWorkloads',
  Messaging = 'Messaging',
  Storage = 'Storage',
  Observability = 'Observability',
  Security = 'Security',
}
