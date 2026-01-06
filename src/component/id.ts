import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';

/**
 * Represents a unique identifier in the form of a kebab-case string.
 *
 * This `Id` type is used to identify entities where the identifier is
 * strictly formatted as a string in kebab-case (e.g., "example-id").
 *
 * Properties:
 * - `value`: The identifier in kebab-case format.
 */
export type ComponentId = {
  value: KebabCaseString;
};

/**
 * Validates whether the given identifier is in a valid kebab-case format.
 *
 * @param {ComponentId} id - The identifier object to validate, containing the value to check.
 * @returns {boolean} - Returns true if the identifier is in a valid kebab-case format, false otherwise.
 */
export const isValidId = (id: ComponentId): string[] => {
  return isValidKebabCaseString(id.value.value).map(
    x => `[Component Id: ${id.value.value}] Id error: ${x}`,
  );
};

/**
 * Represents the default identifier used in the application.
 * It is initialized with a value that will not pass validation.
 */
export const DEFAULT_COMPONENT_ID: ComponentId = {
  value: DEFAULT_KEBAB_CASE_STRING,
};
