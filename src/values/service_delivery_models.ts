/**
 * Enum representing the different types of service delivery models in cloud computing.
 *
 * @enum {string}
 * @readonly
 * @property {string} IaaS Infrastructure as a Service - A model that provides virtualized computing infrastructure over the internet.
 * @property {string} CaaS Container as a Service - A model focused on deploying and managing containers as a service.
 * @property {string} PaaS Platform as a Service - A cloud model that provides a platform allowing users to develop, run, and manage applications without dealing with the underlying infrastructure.
 * @property {string} FaaS Function as a Service - A serverless model where cloud functions are executed in response to events.
 * @property {string} SaaS Software as a Service - A model in which software applications are delivered over the internet on a subscription basis.
 */
export enum ServiceDeliveryModel {
  IaaS = 'IaaS',
  CaaS = 'CaaS',
  PaaS = 'PaaS',
  FaaS = 'FaaS',
  SaaS = 'SaaS'
}