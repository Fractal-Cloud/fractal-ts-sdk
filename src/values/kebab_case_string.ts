/**
 * Represents a string formatted in kebab-case.
 * Kebab-case is a naming convention where words are
 * concatenated together, separated by hyphens, and all
 * characters are in lowercase.
 *
 * This type enforces the structure of a string that adheres
 * to the kebab-case standard. It is typically used in contexts
 * where consistent, hyphen-delimited identifiers are required.
 */
export type KebabCaseString = {
  kebabValue: string;
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
 * A constant variable representing a default kebab-case string.
 *
 * The `DEFAULT_KEBAB_CASE_STRING` is initialized with a `value` key,
 * containing an empty string as its default value.
 *
 * This variable is declared as a constant to prevent modification
 * and is designed to not pass validation checks.
 *
 * @type {KebabCaseString}
 */
export const DEFAULT_KEBAB_CASE_STRING: KebabCaseString = {
  kebabValue: '',
} as const;

/**
 * Validates whether a given string follows the kebab-case format.
 *
 * A string is considered as valid kebab-case if it:
 * - Starts with a lowercase letter.
 * - Contains only lowercase letters, numbers, and hyphens.
 * - Does not have consecutive hyphens.
 * - Does not end or begin with a hyphen.
 *
 * @param {string} value - The string to validate.
 * @returns {string[]} - An empty array if the string is valid, otherwise an array containing an error message.
 */
export const isValidKebabCaseString = (value: string): string[] => {
  const isValid = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/.test(value);
  if (!isValid) {
    return ['Value must be in kebab-case'];
  }
  return [] as const;
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
  const internalState: KebabCaseString = {
    ...DEFAULT_KEBAB_CASE_STRING,
  };

  const builder = {
    withValue: (value: string) => {
      internalState.kebabValue = value;
      return builder;
    },
    reset: () => {
      internalState.kebabValue = DEFAULT_KEBAB_CASE_STRING.kebabValue;
      return builder;
    },
    build: (): KebabCaseString => {
      const validationErrors = isValidKebabCaseString(internalState.kebabValue);
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

export namespace KebabCaseString {
  export const getBuilder = getKebabCaseStringBuilder;
}
