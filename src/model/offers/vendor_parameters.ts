/**
 * offers/vendor_parameters.ts — emit an offer's live component under the
 * parameter keys its agent reads.
 *
 * The default `defineOffer` instantiate forwards neutral parameters under their
 * neutral keys. That is only correct when the agent reads the same key; where it
 * does not, the neutral value never reaches the agent and the agent silently
 * applies its own default. These helpers keep the default emission and rewrite
 * the merged parameters into the vendor's vocabulary first.
 */
import type {
  DeliveryModel,
  InstantiationContext,
  LiveSystemComponent,
  Provider,
} from '../core';

/** Rewrites one component's merged parameters into the vendor's keys and values. */
export type VendorParameters = (
  componentId: string,
  parameters: Record<string, unknown>,
) => Record<string, unknown>;

/**
 * The default single-component emission (neutral parameters overlaid by the
 * offer's config), with the result passed through `toVendor`.
 */
export const instantiateWithVendorParameters =
  (
    offerType: string,
    provider: Provider,
    deliveryModel: DeliveryModel,
    toVendor: VendorParameters,
  ) =>
  (ctx: InstantiationContext, config: unknown): LiveSystemComponent[] => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: offerType,
      provider,
      deliveryModel,
      parameters: toVendor(ctx.id, {
        ...ctx.parameters,
        ...(config as Record<string, unknown>),
      }),
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ];

/** Moves a parameter from the key the SDK names it by to the key the agent reads. */
export const renameParameter =
  (from: string, to: string): VendorParameters =>
  (_componentId, parameters) => {
    if (!(from in parameters)) {
      return parameters;
    }
    const {[from]: value, ...rest} = parameters;
    return {...rest, [to]: value};
  };

/** Removes a parameter the agent has no use for, so it is not shipped unread. */
export const dropParameter =
  (key: string): VendorParameters =>
  (_componentId, parameters) => {
    if (!(key in parameters)) {
      return parameters;
    }
    return Object.fromEntries(
      Object.entries(parameters).filter(([name]) => name !== key),
    );
  };

/** Applies several rewrites in order. */
export const composeVendorParameters =
  (...steps: readonly VendorParameters[]): VendorParameters =>
  (componentId, parameters) =>
    steps.reduce((acc, step) => step(componentId, acc), parameters);
