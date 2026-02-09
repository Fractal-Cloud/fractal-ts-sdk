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
 * This variable is declared as a constant to prevent modification
 * and is designed to not pass validation checks.
 */
export const DEFAULT_OWNER_ID: OwnerId = {
  value: '',
} as const;

/**
 * Validates whether the given string value is a valid UUID.
 *
 * This function checks if the provided `value` conforms to the UUID format.
 * If the validation fails, an array containing an error message will be returned.
 * If the validation passes, an empty array is returned.
 *
 * @param {string} value - The string value to be validated.
 * @returns {string[]} An array containing error messages if invalid, or an empty array if valid.
 */
export const isValidOwnerId = (value: string): string[] => {
  const isValidUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  if (!isValidUuid) {
    return [`Owner Id '${value}' must be a valid uuid`];
  }
  return [] as const;
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
      const validationErrors = isValidOwnerId(internalState.value);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      return {
        ...internalState,
      };
    },
  };

  return builder;
};
