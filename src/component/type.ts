import {
  DEFAULT_PASCAL_CASE_STRING,
  isValidPascalCaseString,
  PascalCaseString,
} from '../values/pascal_case_string';
import {InfrastructureDomain} from '../values/infrastructure_domain';

/**
 * Represents a type definition with properties that describe a specific domain and its corresponding name.
 *
 * @typedef {Object} ComponentType
 * @property {InfrastructureDomain} domain - The domain associated with the type, representing a specific area of infrastructure.
 * @property {PascalCaseString} name - The PascalCase formatted string that represents the name of the type.
 */
export type ComponentType = {
  domain: InfrastructureDomain;
  name: PascalCaseString;
};

/**
 * Represents the default type configuration for a component.
 *
 * This variable is declared as a constant to prevent modification
 * and is designed to not pass validation checks.
 */
export const DEFAULT_TYPE: ComponentType = {
  domain: InfrastructureDomain.ApiManagement,
  name: DEFAULT_PASCAL_CASE_STRING,
};

/**
 * A builder interface for constructing Type objects in a fluent and type-safe manner.
 *
 * The TypeBuilder provides methods to configure a Type's properties step-by-step,
 * validate the configuration, and produce an immutable Type instance. It follows
 * the builder pattern, allowing method chaining for a more readable API.
 *
 * @typedef {Object} TypeBuilder
 */
export type TypeBuilder = {
  /**
   * Sets the infrastructure domain for the type being built.
   *
   * @param {InfrastructureDomain} domain - The infrastructure domain to associate with the type.
   * @returns {TypeBuilder} The builder instance for method chaining.
   */
  withInfrastructureDomain: (domain: InfrastructureDomain) => TypeBuilder;

  /**
   * Sets the PascalCase name for the type being built.
   *
   * @param {PascalCaseString} name - The PascalCase formatted name for the type.
   * @returns {TypeBuilder} The builder instance for method chaining.
   */
  withName: (name: PascalCaseString) => TypeBuilder;

  /**
   * Resets the builder's internal state to default values.
   *
   * This method clears all previously configured properties and returns
   * the builder to its initial state, allowing it to be reused for
   * constructing a new Type instance.
   *
   * @returns {TypeBuilder} The builder instance for method chaining.
   */
  reset: () => TypeBuilder;

  /**
   * Validates and constructs the final Type object.
   *
   * This method performs validation on the configured properties to ensure
   * the Type is valid (domain must be initialized and name must be in PascalCase).
   * If validation fails, a SyntaxError is thrown.
   *
   * @returns {ComponentType} An immutable Type instance with the configured properties.
   * @throws {SyntaxError} If the type configuration is invalid.
   */
  build: () => ComponentType;
};

/**
 * Validates the provided component type and checks for errors in the type's name.
 *
 * The validation ensures that the name of the component type follows the PascalCase string format.
 * If any violations are detected, it returns an array of error messages. Each error message is
 * formatted to include the component type's name and a descriptive error message.
 *
 * @param {ComponentType} type - The component type object to be validated.
 * @returns {string[]} An array of error messages if validation fails; an empty array if the name is valid.
 */
export const isValidType = (type: ComponentType): string[] => {
  const nameError = isValidPascalCaseString(type.name.value);
  if (nameError.length > 0) {
    return nameError.map(
      x => `[Component Type: ${type.name.value}] Name error: ${x}`,
    );
  }
  return [] as const;
};

/**
 * Creates and returns a builder for constructing a `TypeBuilder` instance.
 *
 * This builder provides methods to configure and customize the properties
 * of a `ComponentType` object before it is finalized and built.
 *
 * @returns {TypeBuilder} A builder instance for constructing a `ComponentType`.
 *
 * @property {Function} withInfrastructureDomain - Sets the `domain` property
 * of the internal state with the provided `InfrastructureDomain` value.
 *
 * @property {Function} withName - Sets the `name` property of the internal
 * state with the provided `PascalCaseString` value.
 *
 * @property {Function} reset - Resets the internal state of the builder to
 * the default `ComponentType` values.
 *
 * @property {Function} build - Validates the internal state of the builder
 * and returns a finalized `ComponentType` object. Throws a `SyntaxError` if
 * validation fails.
 */
export const getTypeBuilder = (): TypeBuilder => {
  const internalState: ComponentType = {
    ...DEFAULT_TYPE,
  };

  const builder = {
    withInfrastructureDomain: (domain: InfrastructureDomain) => {
      internalState.domain = domain;
      return builder;
    },
    withName: (name: PascalCaseString) => {
      internalState.name = name;
      return builder;
    },
    reset: () => {
      internalState.domain = DEFAULT_TYPE.domain;
      internalState.name = DEFAULT_TYPE.name;
      return builder;
    },
    build: (): ComponentType => {
      const validationErrors = isValidType(internalState);
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
