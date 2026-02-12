import {Fractal} from './index';
import {DEFAULT_FRACTAL_ID, FractalId, isValidFractalId} from './id';
import {isValidBlueprintComponent} from './component/entity';
import {BlueprintComponent} from './component';
import {FractalService} from './service';

/**
 * Represents the default configuration for a fractal object.
 * This variable initializes a fractal with predefined values and
 * provides default methods for deployment and destruction.
 *
 * @constant {Fractal} DEFAULT_FRACTAL
 * @property {string} id - The unique identifier of the fractal.
 * @property {boolean} isPrivate - Determines if the fractal is private.
 * @property {string} description - A brief description of the fractal.
 * @property {Array} components - A collection of components associated with the fractal.
 * @property {function} deploy - A method to deploy the fractal.
 * @property {function} destroy - A method to clean up or destroy the fractal.
 */
export const DEFAULT_FRACTAL: Fractal = {
  id: DEFAULT_FRACTAL_ID,
  isPrivate: false,
  description: '',
  components: [],
  deploy: () => Promise.reject(),
  destroy: () => Promise.reject(),
};

/**
 * Validates a given fractal object and returns a list of error messages if any issues are found.
 *
 * This function checks the following:
 * 1. Validity of the fractal's ID through the `isValidFractalId` function.
 * 2. Presence and validity of the fractal's components through the `isValidBlueprintComponent` function.
 *
 * If the fractal has:
 * - An invalid ID: Any errors related to the ID are added to the error list.
 * - No components or an empty components array: Adds an error indicating components must not be empty.
 * - Invalid components: Errors from validating each component are appended to the error list.
 *
 * @param {Fractal} fractal - The fractal object to validate. Must include an ID and an array of components.
 * @returns {string[]} An array of error messages describing any validation issues with the fractal.
 */
export const isValidFractal = (fractal: Fractal): string[] => {
  const idErrors = isValidFractalId(fractal.id);
  const componentsErrors =
    !fractal.components || fractal.components.length === 0
      ? [`[Fractal: ${fractal.id.toString()}]: components must not be empty`]
      : fractal.components.reduce((acc, x) => {
          acc.push(...isValidBlueprintComponent(x));
          return acc;
        }, [] as string[]);
  return [...idErrors, ...componentsErrors];
};

/**
 * Represents a builder for creating and configuring Fractal objects.
 */
export type FractalBuilder = {
  /**
   * Sets the identifier for the fractal using the provided value.
   *
   * @param {FractalId} value - The unique identifier to assign to the fractal.
   * @returns {FractalBuilder} The instance of the FractalBuilder for method chaining.
   */
  withId: (value: FractalId) => FractalBuilder;

  /**
   * Sets the privacy flag for the FractalBuilder.
   *
   * @param {boolean} value - Indicates whether the entity should be marked as private.
   * @returns {FractalBuilder} The updated instance of the FractalBuilder.
   */
  withIsPrivate: (value: boolean) => FractalBuilder;

  /**
   * Assigns a description to the fractal being built.
   *
   * @param {string} value - The description to associate with the fractal.
   * @returns {FractalBuilder} The instance of the FractalBuilder to allow method chaining.
   */
  withDescription: (value: string) => FractalBuilder;

  /**
   * A method used to associate a set of components with a FractalBuilder instance.
   *
   * @param {BlueprintComponent[]} value - An array of BlueprintComponent objects to be linked to the FractalBuilder.
   * @returns {FractalBuilder} The FractalBuilder instance with the specified components applied.
   */
  withComponents: (value: BlueprintComponent[]) => FractalBuilder;

  /**
   * Assigns a specified BlueprintComponent to the current FractalBuilder instance.
   *
   * @param {BlueprintComponent} value - The component to be added to the FractalBuilder.
   * @returns {FractalBuilder} The updated instance of FractalBuilder for chaining further configurations.
   */
  withComponent: (value: BlueprintComponent) => FractalBuilder;

  /**
   * Resets the current state of the FractalBuilder to its initial configuration.
   *
   * @function
   * @returns {FractalBuilder} Returns the updated FractalBuilder instance after resetting.
   */
  reset: () => FractalBuilder;

  /**
   * A function that generates and returns a new instance of a Fractal object.
   *
   * This function is typically used to construct complex structures or data
   * representations that follow a fractal pattern. The returned Fractal object
   * encapsulates the properties and behaviors associated with the fractal design.
   *
   * @function
   * @returns {Fractal} A newly created instance of a Fractal object.
   */
  build: () => Fractal;
};

/**
 * Creates and returns a builder object for constructing Fractal objects.
 *
 * This builder provides a fluent interface for setting various properties of a Fractal
 * and includes methods for validation, resetting to defaults, and final construction.
 *
 * @returns {FractalBuilder} A builder object for incrementally building a Fractal.
 *
 * The builder object supports the following methods:
 * - `withId(value: FractalId): FractalBuilder` - Sets the ID of the Fractal.
 * - `withIsPrivate(value: boolean): FractalBuilder` - Sets the privacy status of the Fractal.
 * - `withDescription(value: string): FractalBuilder` - Sets the description of the Fractal.
 * - `withComponents(value: BlueprintComponent[]): FractalBuilder` - Appends a list of components to the Fractal.
 * - `withComponent(value: BlueprintComponent): FractalBuilder` - Appends a single component to the Fractal.
 * - `reset(): FractalBuilder` - Resets the builder’s state to the default Fractal properties.
 * - `build(): Fractal` - Validates and constructs a Fractal object.
 *
 * Throws:
 * - `SyntaxError` - If the constructed Fractal object is invalid during the build process.
 */
export const getFractalBuilder = (): FractalBuilder => {
  const internalState: Fractal = {
    ...DEFAULT_FRACTAL,
  };

  const builder = {
    withId: (value: FractalId) => {
      internalState.id = value;
      return builder;
    },
    withIsPrivate: (value: boolean) => {
      internalState.isPrivate = value;
      return builder;
    },
    withDescription: (value: string) => {
      internalState.description = value;
      return builder;
    },
    withComponents: (value: BlueprintComponent[]) => {
      if (!internalState.components) {
        internalState.components = [];
      }
      internalState.components.push(...value);
      return builder;
    },
    withComponent: (value: BlueprintComponent) => {
      if (!internalState.components) {
        internalState.components = [];
      }
      internalState.components.push(value);
      return builder;
    },
    reset: (): FractalBuilder => {
      internalState.id = DEFAULT_FRACTAL.id;
      internalState.isPrivate = DEFAULT_FRACTAL.isPrivate;
      internalState.description = DEFAULT_FRACTAL.description;
      internalState.components = DEFAULT_FRACTAL.components;
      return builder;
    },
    build: (): Fractal => {
      const validationErrors = isValidFractal(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      return {
        ...internalState,
        deploy: credentials =>
          FractalService.deploy(credentials, internalState),
        destroy: credentials =>
          FractalService.destroy(credentials, internalState.id),
      };
    },
  };

  return builder;
};
