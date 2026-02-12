import {OwnerType} from '../values/owner_type';
import {DEFAULT_OWNER_ID, isValidOwnerId, OwnerId} from '../values/owner_id';
import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';

/**
 * Represents a unique identifier for an environment that includes type, ownership, and name information.
 *
 * This type encapsulates the details necessary to uniquely identify an environment,
 * including its owning entity, a descriptive name, and utility methods to compare
 * or represent the identifier as a string.
 *
 * Properties:
 * - `ownerType`: Specifies the type of the owner associated with the environment.
 * - `ownerId`: Uniquely identifies the owner of the environment.
 * - `name`: The name of the environment formatted as a kebab-case string.
 *
 * Methods:
 * - `equals`: Compares the current environment identifier with another `EnvironmentId` to check if they are identical.
 * - `toString`: Converts the environment identifier into a string representation.
 */
export type EnvironmentId = {
  _type: 'environment';
  ownerType: OwnerType;
  ownerId: OwnerId;
  name: KebabCaseString;
  equals: (other: EnvironmentId) => boolean;
  toString: () => string;
};

const equals = (a: EnvironmentId, b: EnvironmentId): boolean =>
  a.ownerType === b.ownerType &&
  a.ownerId.value === b.ownerId.value &&
  a.name.value === b.name.value;

/**
 * Represents the default environment identifier used within the system.
 * The variable holds a constant, immutable object reflecting the default
 * properties and metadata of an environment.
 *
 * Properties:
 * - `ownerType`: An enumeration value specifying the type of owner (e.g., personal).
 * - `ownerId`: A constant value representing the default owner identifier.
 * - `name`: A default kebab-case formatted string for the environment name.
 * - `equals`: A function that always returns `false`, used to compare equality with another environment.
 * - `toString`: A function returning an empty string representation of the environment.
 *
 * The object is defined as `const` to ensure its immutability and integrity throughout its usage.
 */
export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = {
  _type: 'environment',
  ownerType: OwnerType.Personal,
  ownerId: DEFAULT_OWNER_ID,
  name: DEFAULT_KEBAB_CASE_STRING,
  equals: () => false,
  toString: () => '',
} as const;

/**
 * Validates whether the given environment ID is valid by checking its owner ID and name.
 *
 * @param {EnvironmentId} value - The environment ID to validate, which consists of an owner ID and a name.
 * @returns {string[]} An array of error messages, where each message describes a specific validation failure
 *                     for either the owner ID or the name. If no errors are present, the array is empty.
 */
export const isValidEnvironmentId = (value: EnvironmentId): string[] => {
  const ownerIdErrors = addContextToErrors(
    value,
    isValidOwnerId(value.ownerId),
  );
  const nameErrors = addContextToErrors(
    value,
    isValidKebabCaseString(value.name.toString()),
  );
  return [...ownerIdErrors, ...nameErrors];
};

const addContextToErrors = (
  value: EnvironmentId,
  errors: string[],
): string[] => {
  return errors.map(
    error => `[Environment Id: ${environmentIdToString(value)}]${error}`,
  );
};

const environmentIdToString = (id: EnvironmentId) =>
  `${id.ownerType.toString()}/${id.ownerId.value}/${id.name.value}`;

/**
 * A builder utility to construct an EnvironmentId with various parameters.
 * Provides a chainable API for setting properties and building the final object.
 */
export type EnvironmentIdBuilder = {
  /**
   * Sets the owner type of the Id.
   * @param ownerType - The type of the owner (e.g., Personal, Organization)
   * @returns The builder instance for method chaining
   */
  withOwnerType: (ownerType: OwnerType) => EnvironmentIdBuilder;

  /**
   * Sets the owner ID of the Id.
   * @param ownerId - The unique identifier of the owner
   * @returns The builder instance for method chaining
   */
  withOwnerId: (ownerId: OwnerId) => EnvironmentIdBuilder;

  /**
   * Sets the name of the Id.
   * @param name - The name in kebab-case format
   * @returns The builder instance for method chaining
   */
  withName: (name: KebabCaseString) => EnvironmentIdBuilder;

  /**
   * Resets the builder to its default state, restoring all default values.
   * @returns The builder instance for method chaining
   */
  reset: () => EnvironmentIdBuilder;

  /**
   * Constructs and returns the final Id object.
   * @returns The constructed Id object
   * @throws {SyntaxError} If the resulting Id is invalid
   */
  build: () => EnvironmentId;
};

/**
 * Creates and returns a builder for constructing a `Id` object.
 *
 * The builder allows customization of the `Id` properties such as `ownerType`,
 * while also enforcing constraints during the construction process, ensuring the resulting object is valid.
 * The builder is stateful and provides a method to reset to default values if needed.
 *
 * @returns {EnvironmentIdBuilder} A builder object that provides methods for modifying and constructing a `Id`.
 *
 * @throws {SyntaxError} Throws an error if the resulting `Id` is invalid when the `build` method is invoked.
 */
export const getEnvironmentIdBuilder = (): EnvironmentIdBuilder => {
  const internalState: EnvironmentId = {
    ...DEFAULT_ENVIRONMENT_ID,
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
      internalState.ownerType = DEFAULT_ENVIRONMENT_ID.ownerType;
      internalState.ownerId = DEFAULT_ENVIRONMENT_ID.ownerId;
      internalState.name = DEFAULT_ENVIRONMENT_ID.name;
      return builder;
    },
    build: (): EnvironmentId => {
      const validationErrors = isValidEnvironmentId(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      const builtId: EnvironmentId = {
        ...internalState,
        equals: (other: EnvironmentId) => equals(builtId, other),
        toString: () => environmentIdToString(builtId),
      };

      return builtId;
    },
  };

  return builder;
};
