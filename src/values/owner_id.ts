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
  const DEFAULT_STRING: OwnerId = {
    value: '',
  } as const;

  const internalState: OwnerId = {
    ...DEFAULT_STRING,
  };

  const isOwnerId = (value: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  };

  const builder = {
    withValue: (value: string) => {
      if (!isOwnerId(value)) {
        throw new RangeError('Value must be a uuid');
      }
      internalState.value = value;
      return builder;
    },
    reset: () => {
      internalState.value = DEFAULT_STRING.value;
      return builder;
    },
    build: (): OwnerId => {
      if (internalState.value === DEFAULT_STRING.value) {
        throw new SyntaxError('OwnerId must be initialized');
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
