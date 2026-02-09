import {Fractal} from "./index";
import {DEFAULT_FRACTAL_ID, FractalId, isValidFractalId} from "./id";
import {isValidBlueprintComponent} from "./component/entity";
import {BlueprintComponent} from "./component";
import {FractalService} from "./service";

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
}

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
  const componentsErrors = !fractal.components || fractal.components.length == 0
    ? [`[Fractal: ${fractal.id.toString()}]: components must not be empty`]
    : fractal.components.reduce((acc, x) => {
      acc.push(...isValidBlueprintComponent(x));
      return acc;
    }, [] as string[]);
  return [...idErrors, ...componentsErrors];
}


export type FractalBuilder = {
  withId: (value: FractalId) => FractalBuilder;
  withIsPrivate: (value: boolean) => FractalBuilder;
  withDescription: (value: string) => FractalBuilder;
  withComponents: (value: BlueprintComponent[]) => FractalBuilder;
  withComponent: (value: BlueprintComponent) => FractalBuilder;
  reset: () => FractalBuilder;
  build: () => Fractal;
};

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
        deploy: credentials => FractalService.deploy(credentials, internalState),
        destroy: credentials => FractalService.destroy(credentials, internalState.id),
      };
    }
  }

  return builder;
}
