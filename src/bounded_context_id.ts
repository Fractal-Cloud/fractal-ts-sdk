import {OwnerType} from './values/owner_type';
import {DEFAULT_OWNER_ID, isValidOwnerId, OwnerId} from './values/owner_id';
import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from './values/kebab_case_string';

/**
 * Represents the unique identifier for a bounded context.
 *
 * A bounded context is a distinct and cohesive domain of responsibility
 * within a larger distributed system or domain, and this type
 * provides the necessary information to identify it.
 *
 * @typedef {Object} BoundedContextId
 *
 * @property {OwnerType} ownerType - The type of the owner associated with the bounded context.
 * @property {OwnerId} ownerId - The unique identifier of the owner.
 * @property {KebabCaseString} name - The name of the bounded context, formatted as a kebab-case string.
 */
export type BoundedContextId = {
  ownerType: OwnerType;
  ownerId: OwnerId;
  name: KebabCaseString;
};

/**
 * A default value for the bounded context identifier used in the system.
 * Represents the unique context in which a set of related operations
 * or processes occur. This constant provides a predefined configuration
 * for cases where a bounded context identifier is required but not explicitly
 * defined.
 *
 * Properties:
 * - `ownerType`: Specifies the ownership type of the bounded context. In this default,
 *   it is predefined as personal ownership (`OwnerType.Personal`).
 * - `ownerId`: Denotes the unique identifier of the owner. This uses the system-wide
 *   `DEFAULT_OWNER_ID` constant.
 * - `name`: The name of the bounded context represented as a kebab-case string. This
 *   is preconfigured to use the `DEFAULT_KEBAB_CASE_STRING` constant.
 *
 * This constant is immutable to ensure consistency and safe usage throughout the
 * application.
 */
export const DEFAULT_BOUNDED_CONTEXT_ID: BoundedContextId = {
  ownerType: OwnerType.Personal,
  ownerId: DEFAULT_OWNER_ID,
  name: DEFAULT_KEBAB_CASE_STRING,
} as const;

/**
 * Determines whether the given value is a valid BoundedContextId.
 *
 * @param {BoundedContextId} value - The BoundedContextId to validate.
 * @returns {boolean} True if the BoundedContextId is valid; otherwise, false.
 *
 * A BoundedContextId is considered valid if:
 * - The `ownerId` component of the value is a valid owner identifier, as verified
 *   by the `isValidOwnerId` function.
 * - The `name` component of the value is in kebab-case format, as verified by
 *   the `isValidKebabCaseString` function.
 */
export const isValidBoundedContextId = (value: BoundedContextId): boolean =>
  isValidOwnerId(value.ownerId.value) &&
  isValidKebabCaseString(value.name.value);

/**
 * Builder interface for constructing BoundedContextId objects.
 * Provides a fluent API for setting and validating bounded context identifiers.
 */
export type BoundedContextIdBuilder = {
  /**
   * Sets the owner type of the BoundedContextId.
   * @param ownerType - The type of the owner (e.g., Personal, Organization)
   * @returns The builder instance for method chaining
   */
  withOwnerType: (ownerType: OwnerType) => BoundedContextIdBuilder;

  /**
   * Sets the owner ID of the BoundedContextId.
   * @param ownerId - The unique identifier of the owner
   * @returns The builder instance for method chaining
   */
  withOwnerId: (ownerId: OwnerId) => BoundedContextIdBuilder;

  /**
   * Sets the name of the BoundedContextId.
   * @param name - The name in kebab-case format
   * @returns The builder instance for method chaining
   */
  withName: (name: KebabCaseString) => BoundedContextIdBuilder;

  /**
   * Resets the builder to its default state, restoring all default values.
   * @returns The builder instance for method chaining
   */
  reset: () => BoundedContextIdBuilder;

  /**
   * Constructs and returns the final BoundedContextId object.
   * @returns The constructed BoundedContextId object
   * @throws {SyntaxError} If the resulting BoundedContextId is invalid
   */
  build: () => BoundedContextId;
};

/**
 * Creates and returns a builder for constructing a `BoundedContextId` object.
 *
 * The builder allows customization of the `BoundedContextId` properties such as `ownerType`,
 * while also enforcing constraints during the construction process, ensuring the resulting object is valid.
 * The builder is stateful and provides a method to reset to default values if needed.
 *
 * @returns {BoundedContextIdBuilder} A builder object that provides methods for modifying and constructing a `BoundedContextId`.
 *
 * @throws {SyntaxError} Throws an error if the resulting `BoundedContextId` is invalid when the `build` method is invoked.
 */
export const getBoundedContextIdBuilder = (): BoundedContextIdBuilder => {
  const internalState: BoundedContextId = {
    ...DEFAULT_BOUNDED_CONTEXT_ID,
  };

  const builder = {
    withOwnerType: (ownerType: OwnerType) => {
      internalState.ownerType = ownerType;
      return builder;
    },
    withOwnerId: (ownerId: OwnerId) => {
      internalState.ownerId = ownerId;
      return builder;
    },
    withName: (name: KebabCaseString) => {
      internalState.name = name;
      return builder;
    },
    reset: () => {
      internalState.ownerType = DEFAULT_BOUNDED_CONTEXT_ID.ownerType;
      internalState.ownerId = DEFAULT_BOUNDED_CONTEXT_ID.ownerId;
      internalState.name = DEFAULT_BOUNDED_CONTEXT_ID.name;
      return builder;
    },
    build: (): BoundedContextId => {
      if (!isValidBoundedContextId(internalState)) {
        throw new SyntaxError(
          ' Bounded Context ID is invalid. OwnerId must be initialized and name must be in Kebab case',
        );
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
