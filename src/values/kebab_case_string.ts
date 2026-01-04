/**
 * Represents a string that adheres to the KebabCase naming convention.
 * This convention capitalizes the first letter of each concatenated word without any spaces, dashes, or underscores.
 */
export type KebabCaseString = {
  value: string;
};

/**
 * Builder interface for constructing KebabCaseString objects.
 * Provides a fluent API for setting and validating Kebab case strings.
 */
export type KebabCaseStringBuilder = {
  /**
   * Sets the value of the KebabCaseString.
   * @param value - The string value in Kebab case format
   * @returns The builder instance for method chaining
   * @throws {RangeError} If the input is not in Kebab case format
   */
  withValue: (value: string) => KebabCaseStringBuilder;

  /**
   * Resets the builder to its default state, clearing the current value.
   * @returns The builder instance for method chaining
   */
  reset: () => KebabCaseStringBuilder;

  /**
   * Constructs and returns the final KebabCaseString object.
   * @returns The constructed KebabCaseString object
   * @throws {SyntaxError} If no value has been set before building
   */
  build: () => KebabCaseString;
};

/**
 * Creates a builder for constructing a KebabCaseString object. The builder enforces Kebab case formatting and ensures
 * a valid string is set before building. Once built, the KebabCaseString object becomes immutable.
 *
 * @function getKebabCaseStringBuilder
 * @returns {Object} A builder object with the following methods:
 * - `withValue(value: string): Object` – Sets the value of the KebabCaseString. Throws a `RangeError` if the input is not in Kebab case format (e.g., "example-string").
 * - `reset(): void` – Resets the builder to its default state, clearing the current value.
 * - `build(): KebabCaseString` – Constructs and returns a KebabCaseString object based on the current state. Throws a `SyntaxError` if no value has been set before building.
 */

export const getKebabCaseStringBuilder = (): KebabCaseStringBuilder => {
  const DEFAULT_STRING: KebabCaseString = {
    value: '',
  } as const;

  const internalState: KebabCaseString = {
    ...DEFAULT_STRING,
  };

  const isKebabCase = (value: string) => {
    return /^[a-z]+(?:-[a-z0-9]+)*$/.test(value);
  };

  const builder = {
    withValue: (value: string) => {
      if (!isKebabCase(value)) {
        throw new RangeError('Value must be in Kebab case');
      }
      internalState.value = value;
      return builder;
    },
    reset: () => {
      internalState.value = DEFAULT_STRING.value;
      return builder;
    },
    build: (): KebabCaseString => {
      if (internalState.value === DEFAULT_STRING.value) {
        throw new SyntaxError('Kebab Case String must be initialized');
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
