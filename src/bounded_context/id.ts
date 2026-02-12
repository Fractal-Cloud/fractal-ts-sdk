import {OwnerType} from '../values/owner_type';
import {DEFAULT_OWNER_ID, isValidOwnerId, OwnerId} from '../values/owner_id';
import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';

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
  _type: 'bounded_context';
  ownerType: OwnerType;
  ownerId: OwnerId;
  name: KebabCaseString;
  equals: (other: BoundedContextId) => boolean;
  toString: () => string;
};

const equals = (a: BoundedContextId, b: BoundedContextId): boolean =>
  a.ownerType === b.ownerType &&
  a.ownerId.ownerIdValue === b.ownerId.ownerIdValue &&
  a.name.value === b.name.value;

/**
 * A default value for the bounded context identifier used in the system.
 * It contains values that will not pass validation checks.
 */
export const DEFAULT_BOUNDED_CONTEXT_ID: BoundedContextId = {
  _type: 'bounded_context',
  ownerType: OwnerType.Personal,
  ownerId: DEFAULT_OWNER_ID,
  name: DEFAULT_KEBAB_CASE_STRING,
  equals: () => false,
  toString: () => '',
} as const;

/**
 * Determines whether the given value is a valid Id.
 *
 * @param {BoundedContextId} value - The Id to validate.
 * @returns {boolean} True if the Id is valid; otherwise, false.
 *
 * A Id is considered valid if:
 * - The `ownerId` component of the value is a valid owner identifier, as verified
 *   by the `isValidOwnerId` function.
 * - The `name` component of the value is in kebab-case format, as verified by
 *   the `isValidKebabCaseString` function.
 */
export const isValidBoundedContextId = (value: BoundedContextId): string[] => {
  const ownerIdErrors = isValidOwnerId(value.ownerId);
  const nameErrors = isValidKebabCaseString(value.name.value);
  return [
    ...ownerIdErrors.map(
      x =>
        `[Bounded Context Id: ${boundedContextIdToString(value)}] Owner Id error: ${x}`,
    ),
    ...nameErrors.map(
      x =>
        `[Bounded Context Id: ${boundedContextIdToString(value)}] Name error: ${x}`,
    ),
  ];
};

const boundedContextIdToString = (id: BoundedContextId) =>
  `${id.ownerType.toString()}/${id.ownerId.ownerIdValue}/${id.name.value}`;

/**
 * Builder interface for constructing Id objects.
 * Provides a fluent API for setting and validating bounded context identifiers.
 */
export type BoundedContextIdBuilder = {
  /**
   * Sets the owner type of the Id.
   * @param ownerType - The type of the owner (e.g., Personal, Organization)
   * @returns The builder instance for method chaining
   */
  withOwnerType: (ownerType: OwnerType) => BoundedContextIdBuilder;

  /**
   * Sets the owner ID of the Id.
   * @param ownerId - The unique identifier of the owner
   * @returns The builder instance for method chaining
   */
  withOwnerId: (ownerId: OwnerId) => BoundedContextIdBuilder;

  /**
   * Sets the name of the Id.
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
   * Constructs and returns the final Id object.
   * @returns The constructed Id object
   * @throws {SyntaxError} If the resulting Id is invalid
   */
  build: () => BoundedContextId;
};

/**
 * Creates and returns a builder for constructing a `Id` object.
 *
 * The builder allows customization of the `Id` properties such as `ownerType`,
 * while also enforcing constraints during the construction process, ensuring the resulting object is valid.
 * The builder is stateful and provides a method to reset to default values if needed.
 *
 * @returns {BoundedContextIdBuilder} A builder object that provides methods for modifying and constructing a `Id`.
 *
 * @throws {SyntaxError} Throws an error if the resulting `Id` is invalid when the `build` method is invoked.
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
      const validationErrors = isValidBoundedContextId(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      const builtId: BoundedContextId = {
        ...internalState,
        equals: (other: BoundedContextId) => equals(builtId, other),
        toString: () => boundedContextIdToString(builtId),
      };

      return builtId;
    },
  };

  return builder;
};
