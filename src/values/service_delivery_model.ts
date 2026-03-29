/**
 * Known service delivery models in cloud computing.
 *
 * This is an open type — custom aria agents may define additional delivery
 * models beyond the built-in set. Any string is accepted where a
 * `ServiceDeliveryModel` is expected; the known values provide
 * autocomplete convenience.
 */
export const ServiceDeliveryModel = {
  IaaS: 'IaaS',
  CaaS: 'CaaS',
  PaaS: 'PaaS',
  FaaS: 'FaaS',
  SaaS: 'SaaS',
} as const;

/**
 * Any of the built-in service delivery model values, or a custom string
 * for models defined by custom aria agents.
 */
export type ServiceDeliveryModel =
  | (typeof ServiceDeliveryModel)[keyof typeof ServiceDeliveryModel]
  | (string & {});
