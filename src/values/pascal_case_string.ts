/**
 * Represents a string that adheres to the PascalCase naming convention.
 * This convention capitalizes the first letter of each concatenated word without any spaces, dashes, or underscores.
 * Commonly used in naming conventions for programming constructs such as types, classes, or enums.
 */
export type PascalCaseString = {
  value: string;
};

/**
 * Builder interface for constructing PascalCaseString objects.
 * Provides a fluent API for setting and validating Pascal case strings.
 */
export type PascalCaseStringBuilder = {
  /**
   * Sets the value of the PascalCaseString.
   * @param value - The string value in Pascal case format
   * @returns The builder instance for method chaining
   * @throws {RangeError} If the input is not in Pascal case format
   */
  withValue: (value: string) => PascalCaseStringBuilder;

  /**
   * Resets the builder to its default state, clearing the current value.
   * @returns The builder instance for method chaining
   */
  reset: () => PascalCaseStringBuilder;

  /**
   * Constructs and returns the final PascalCaseString object.
   * @returns The constructed PascalCaseString object
   * @throws {SyntaxError} If no value has been set before building
   */
  build: () => PascalCaseString;
};

/**
 * Checks whether a given string is in valid PascalCase format.
 *
 * A valid PascalCase string starts with an uppercase letter, followed by
 * zero or more alphabetic characters (uppercase or lowercase). It must
 * not contain any numbers, spaces, or special characters.
 *
 * @param {string} value - The string to validate as PascalCase.
 * @returns {boolean} - Returns true if the string is in valid PascalCase format; otherwise, false.
 */
export const isValidPascalCaseString = (value: string) => {
  return /^[A-Z][a-zA-Z]*$/.test(value);
};

/**
 * A constant object representing a default PascalCase formatted string.
 * It provides an initial empty value that adheres to the PascalCase naming convention.
 * This object is immutable and is intended for use in scenarios requiring strict PascalCase string formatting.
 */
export const DEFAULT_PASCAL_CASE_STRING: PascalCaseString = {
  value: '',
} as const;

/**
 * Creates a builder for constructing a PascalCaseString object. The builder enforces Pascal case formatting and ensures
 * a valid string is set before building. Once built, the PascalCaseString object becomes immutable.
 *
 * @function getPascalCaseStringBuilder
 * @returns {Object} A builder object with the following methods:
 * - `withValue(value: string): Object` – Sets the value of the PascalCaseString. Throws a `RangeError` if the input is not in Pascal case format (e.g., "ExampleString").
 * - `reset(): void` – Resets the builder to its default state, clearing the current value.
 * - `build(): PascalCaseString` – Constructs and returns a PascalCaseString object based on the current state. Throws a `SyntaxError` if no value has been set before building.
 */
export const getPascalCaseStringBuilder = (): PascalCaseStringBuilder => {
  const internalState: PascalCaseString = {
    ...DEFAULT_PASCAL_CASE_STRING,
  };

  const builder = {
    withValue: (value: string) => {
      if (!isValidPascalCaseString(value)) {
        throw new RangeError('Value must be in Pascal case');
      }
      internalState.value = value;
      return builder;
    },
    reset: () => {
      internalState.value = DEFAULT_PASCAL_CASE_STRING.value;
      return builder;
    },
    build: (): PascalCaseString => {
      if (internalState.value === DEFAULT_PASCAL_CASE_STRING.value) {
        throw new SyntaxError('Pascal Case String must be initialized');
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
