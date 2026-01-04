/**
 * Represents a string that adheres to the OwnerId naming convention.
 * This convention capitalizes the first letter of each concatenated word without any spaces, dashes, or underscores.
 */
export type OwnerId = {
  value: string;
};

/**
 * Builder interface for constructing OwnerId objects.
 * Provides a fluent API for setting and validating uuid strings.
 */
export type OwnerIdBuilder = {
  /**
   * Sets the value of the OwnerId.
   * @param value - The string value in uuid format
   * @returns The builder instance for method chaining
   * @throws {RangeError} If the input is not in uuid case format
   */
  withValue: (value: string) => OwnerIdBuilder;

  /**
   * Resets the builder to its default state, clearing the current value.
   * @returns The builder instance for method chaining
   */
  reset: () => OwnerIdBuilder;

  /**
   * Constructs and returns the final OwnerId object.
   * @returns The constructed OwnerId object
   * @throws {SyntaxError} If no value has been set before building
   */
  build: () => OwnerId;
};

/**
 * A constant variable representing the default owner ID.
 *
 * This variable is used as a placeholder or default value
 * for the owner identifier in contexts where an explicit
 * owner ID is not provided. It is an immutable constant
 * meant to ensure consistency in scenarios requiring a
 * reference to a default owner.
 *
 * The `value` property within this object is initialized
 * to an empty string, implying no specific owner is set.
 */
export const DEFAULT_OWNER_ID: OwnerId = {
  value: '',
} as const;

/**
 * Determines whether the provided value is a valid owner ID.
 *
 * This function checks if the given string matches the standard format
 * of a UUID (Universally Unique Identifier) version 4. A valid owner ID
 * is expected to follow the pattern "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
 * where "x" represents a hexadecimal digit.
 *
 * @param {string} value - The string to be validated as a UUID.
 * @returns {boolean} Returns true if the string matches the UUID format; otherwise, false.
 */
export const isValidOwnerId = (value: string) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );
};

/**
 * Creates a builder for constructing a OwnerId object. The builder enforces uuid case formatting and ensures
 * a valid string is set before building. Once built, the OwnerId object becomes immutable.
 *
 * @function getOwnerIdBuilder
 * @returns {Object} A builder object with the following methods:
 * - `withValue(value: string): Object` – Sets the value of the OwnerId. Throws a `RangeError` if the input is not in uuid format (e.g., "550e8400-e29b-41d4-a716-446655440000").
 * - `reset(): void` – Resets the builder to its default state, clearing the current value.
 * - `build(): OwnerId` – Constructs and returns a OwnerId object based on the current state. Throws a `SyntaxError` if no value has been set before building.
 */
export const getOwnerIdBuilder = (): OwnerIdBuilder => {
  const internalState: OwnerId = {
    ...DEFAULT_OWNER_ID,
  };

  const builder = {
    withValue: (value: string) => {
      if (!isValidOwnerId(value)) {
        throw new RangeError('Value must be a uuid');
      }
      internalState.value = value;
      return builder;
    },
    reset: () => {
      internalState.value = DEFAULT_OWNER_ID.value;
      return builder;
    },
    build: (): OwnerId => {
      if (internalState.value === DEFAULT_OWNER_ID.value) {
        throw new SyntaxError('OwnerId must be initialized');
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
