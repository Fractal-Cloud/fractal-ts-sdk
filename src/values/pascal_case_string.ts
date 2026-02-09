/**
 * Represents a string that adheres to the PascalCase naming convention.
 * This convention capitalizes the first letter of each concatenated word without any spaces, dashes, or underscores.
 * Commonly used in naming conventions for programming constructs such as types, classes, or enums.
 */
export type PascalCaseString = {
  pascalValue: string;
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
 * Validates whether a given string is in PascalCase format.
 * A PascalCase string must start with an uppercase letter and contain
 * only alphabetic characters.
 *
 * @param {string} value - The string to validate.
 * @returns {string[]} An array containing an error message if the string
 *                     does not conform to PascalCase, or an empty array
 *                     if the string is valid.
 */
export const isValidPascalCaseString = (value: string): string[] => {
  const isValid = /^[A-Z][a-zA-Z]*$/.test(value);
  if (!isValid) {
    return [`Value '${value}' must be in PascalCase`];
  }
  return [] as const;
};

/**
 * A constant object representing a default PascalCase formatted string.
 *
 * This variable is declared as a constant to prevent modification
 * and is designed to not pass validation checks.
 */
export const DEFAULT_PASCAL_CASE_STRING: PascalCaseString = {
  pascalValue: '',
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
      internalState.pascalValue = value;
      return builder;
    },
    reset: () => {
      internalState.pascalValue = DEFAULT_PASCAL_CASE_STRING.pascalValue;
      return builder;
    },
    build: (): PascalCaseString => {
      const validationErrors = isValidPascalCaseString(
        internalState.pascalValue,
      );
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

export namespace PascalCaseString {
  export const getBuilder = getPascalCaseStringBuilder;
}
