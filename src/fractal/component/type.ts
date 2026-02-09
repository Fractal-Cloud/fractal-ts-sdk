import {Component} from '../../component';
import {ServiceDeliveryModel} from '../../values/service_delivery_model';
import {InfrastructureDomain} from '../../values/infrastructure_domain';
import {PascalCaseString} from '../../values/pascal_case_string';
import {
  DEFAULT_COMPONENT_TYPE,
  isValidComponentType,
} from '../../component/type';

/**
 * Represents a blueprint component type that extends the base `Component.Type`
 * with additional properties and modifications. This type omits the `equals`
 * method from `Component.Type` and introduces its own implementation, along
 * with a custom `serviceDeliveryModel` property.
 *
 * BlueprintComponentType provides a way to define a component's blueprint with
 * a specific service delivery model while also enabling object equality
 * comparisons customized to the requirements of blueprint components.
 *
 * Properties:
 * - Inherits all properties from `Component.Type` except for the `equals` method.
 * - Adds a `serviceDeliveryModel` property to specify how the service is delivered.
 * - Reimplements the `equals` method for comparing two blueprint component types.
 */
export type BlueprintComponentType = Omit<Component.Type, 'equals'> & {
  serviceDeliveryModel: ServiceDeliveryModel;
};

/**
 */
export const DEFAULT_BLUEPRINT_COMPONENT_TYPE: BlueprintComponentType = {
  ...DEFAULT_COMPONENT_TYPE,
  serviceDeliveryModel: ServiceDeliveryModel.SaaS,
};

/**
 * A builder interface for constructing Type objects in a fluent and type-safe manner.
 *
 * The TypeBuilder provides methods to configure a Type's properties step-by-step,
 * validate the configuration, and produce an immutable Type instance. It follows
 * the builder pattern, allowing method chaining for a more readable API.
 *
 * @typedef {Object} BlueprintComponentTypeBuilder
 */
export type BlueprintComponentTypeBuilder = {
  /**
   * Sets the infrastructure domain for the type being built.
   *
   * @param {InfrastructureDomain} domain - The infrastructure domain to associate with the type.
   * @returns {BlueprintComponentTypeBuilder} The builder instance for method chaining.
   */
  withInfrastructureDomain: (
    domain: InfrastructureDomain,
  ) => BlueprintComponentTypeBuilder;

  /**
   * Configures the builder to use the specified service delivery model.
   *
   * @param {ServiceDeliveryModel} serviceDeliveryModel - The service delivery model to be applied during the building process.
   * @returns {BlueprintComponentTypeBuilder} The builder instance for chaining additional configurations.
   */
  withServiceDeliveryModel: (
    serviceDeliveryModel: ServiceDeliveryModel,
  ) => BlueprintComponentTypeBuilder;

  /**
   * Sets the PascalCase name for the type being built.
   *
   * @param {PascalCaseString} name - The PascalCase formatted name for the type.
   * @returns {BlueprintComponentTypeBuilder} The builder instance for method chaining.
   */
  withName: (name: PascalCaseString) => BlueprintComponentTypeBuilder;

  /**
   * Resets the builder's internal state to default values.
   *
   * This method clears all previously configured properties and returns
   * the builder to its initial state, allowing it to be reused for
   * constructing a new Type instance.
   *
   * @returns {BlueprintComponentTypeBuilder} The builder instance for method chaining.
   */
  reset: () => BlueprintComponentTypeBuilder;

  /**
   * Validates and constructs the final Type object.
   *
   * This method performs validation on the configured properties to ensure
   * the Type is valid (domain must be initialized and name must be in PascalCase).
   * If validation fails, a SyntaxError is thrown.
   *
   * @returns {BlueprintComponentType} An immutable Type instance with the configured properties.
   * @throws {SyntaxError} If the type configuration is invalid.
   */
  build: () => BlueprintComponentType;
};

/**
 * Validates the provided component type and checks for errors in the type's name.
 *
 * The validation ensures that the name of the component type follows the PascalCase string format.
 * If any violations are detected, it returns an array of error messages. Each error message is
 * formatted to include the component type's name and a descriptive error message.
 *
 * @param {BlueprintComponentType} type - The component type object to be validated.
 * @returns {string[]} An array of error messages if validation fails; an empty array if the name is valid.
 */
export const isValidBlueprintComponentType = (
  type: BlueprintComponentType,
): string[] => isValidComponentType(type);

/**
 * Creates and returns a builder for constructing a `TypeBuilder` instance.
 *
 * This builder provides methods to configure and customize the properties
 * of a `ComponentType` object before it is finalized and built.
 *
 * @returns {BlueprintComponentTypeBuilder} A builder instance for constructing a `ComponentType`.
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
export const getBlueprintComponentTypeBuilder =
  (): BlueprintComponentTypeBuilder => {
    const internalState: BlueprintComponentType = {
      ...DEFAULT_BLUEPRINT_COMPONENT_TYPE,
    };

    const builder = {
      withInfrastructureDomain: (domain: InfrastructureDomain) => {
        internalState.domain = domain;
        return builder;
      },
      withServiceDeliveryModel: (
        serviceDeliveryModel: ServiceDeliveryModel,
      ) => {
        internalState.serviceDeliveryModel = serviceDeliveryModel;
        return builder;
      },
      withName: (name: PascalCaseString) => {
        internalState.name = name;
        return builder;
      },
      reset: () => {
        internalState.domain = DEFAULT_BLUEPRINT_COMPONENT_TYPE.domain;
        internalState.serviceDeliveryModel =
          DEFAULT_BLUEPRINT_COMPONENT_TYPE.serviceDeliveryModel;
        internalState.name = DEFAULT_BLUEPRINT_COMPONENT_TYPE.name;
        return builder;
      },
      build: (): BlueprintComponentType => {
        const validationErrors = isValidBlueprintComponentType(internalState);
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
