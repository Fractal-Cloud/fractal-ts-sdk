import {LiveSystem} from './index';
import {DEFAULT_LIVE_SYSTEM_ID, isValidLiveSystemId, LiveSystemId} from './id';
import {isValidLiveSystemComponent} from './component/entity';
import {LiveSystemComponent} from './component';
import {DEFAULT_FRACTAL_ID, isValidFractalId} from '../fractal/id';
import {Fractal} from '../fractal';
import {Component} from '../component';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemService} from './service';
import {DEFAULT_ENVIRONMENT} from '../environment/entity';

const DEFAULT_LIVE_SYSTEM: LiveSystem = {
  id: DEFAULT_LIVE_SYSTEM_ID,
  requesterId: '',
  fractalId: DEFAULT_FRACTAL_ID,
  description: '',
  status: 'Unknown',
  statusMessage: '',
  components: [],
  genericProvider: 'Unknown',
  parameters: getParametersInstance(),
  createdAt: new Date(),
  updatedAt: new Date(),
  environment: DEFAULT_ENVIRONMENT,
  deploy: () => Promise.reject(),
  destroy: () => Promise.reject(),
};

/**
 * Validates a given live system and returns a list of error messages if any validation fails.
 *
 * This function verifies the following:
 * - The `id` of the live system is valid.
 * - The `fractalId` of the live system is valid.
 * - The `components` field is not empty and all its components pass validation.
 *
 * @param {LiveSystem} liveSystem - The live system object to be validated.
 * @returns {string[]} An array of error messages. If validation passes, this array will be empty.
 */
export const isValidLiveSystem = (liveSystem: LiveSystem): string[] => {
  const idErrors = isValidLiveSystemId(liveSystem.id);
  const fractalIdErrors = isValidFractalId(liveSystem.fractalId);
  const componentsErrors =
    !liveSystem.components || liveSystem.components.length === 0
      ? [
          `[Live System: ${liveSystem.id.toString()}]: components must not be empty`,
        ]
      : liveSystem.components.reduce((acc, x) => {
          acc.push(...isValidLiveSystemComponent(x));
          return acc;
        }, [] as string[]);
  return [...idErrors, ...fractalIdErrors, ...componentsErrors];
};

/**
 * A builder interface for constructing a LiveSystem instance with various configurations.
 */
export type LiveSystemBuilder = {
  /**
   * Sets the identifier for the LiveSystemBuilder instance.
   *
   * @param {LiveSystemId} value - The unique identifier to associate with the LiveSystemBuilder.
   * @returns {LiveSystemBuilder} The current instance of the LiveSystemBuilder for chaining further configurations.
   */
  withId: (value: LiveSystemId) => LiveSystemBuilder;

  /**
   * A method that assigns a Fractal ID to the live system builder.
   *
   * @param {Fractal.Id} value - The unique identifier associated with the fractal.
   * @returns {LiveSystemBuilder} The current instance of the live system builder, allowing method chaining.
   */
  withFractalId: (value: Fractal.Id) => LiveSystemBuilder;

  /**
   * Sets the description for the system being built.
   *
   * @param {string} value - The description to be assigned.
   * @returns {LiveSystemBuilder} The builder instance to allow method chaining.
   */
  withDescription: (value: string) => LiveSystemBuilder;

  /**
   * Configures the current builder with the specified set of system components.
   *
   * @param {LiveSystemComponent[]} value - An array of components to be added to the system.
   * @returns {LiveSystemBuilder} The updated instance of the builder for method chaining.
   */
  withComponents: (value: LiveSystemComponent[]) => LiveSystemBuilder;

  /**
   * Attaches a specified component to the current LiveSystemBuilder instance.
   *
   * @param {LiveSystemComponent} value - The component to be added to the system.
   * @returns {LiveSystemBuilder} The updated LiveSystemBuilder instance, allowing for further configuration or chaining of components.
   */
  withComponent: (value: LiveSystemComponent) => LiveSystemBuilder;

  /**
   * A method that sets a generic provider for the live system builder.
   *
   * @param {LiveSystemComponent.Provider} value - The provider instance to be applied within the live system.
   * @returns {LiveSystemBuilder} The current instance of the live system builder, allowing for method chaining.
   */
  withGenericProvider: (
    value: LiveSystemComponent.Provider,
  ) => LiveSystemBuilder;

  /**
   * Sets the parameters for the live system being built.
   *
   * @param {LiveSystem.Parameters} parameters - The parameters to associate with the live system.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withParameters: (parameters: Component.Parameters) => LiveSystemBuilder;

  /**
   * Resets the current state of the LiveSystemBuilder to its initial configuration.
   * This operation typically clears any modifications or settings that have been applied
   * and returns a fresh instance ready for reconfiguration.
   *
   * @function
   * @returns {LiveSystemBuilder} A new instance of the LiveSystemBuilder with default settings.
   */
  reset: () => LiveSystemBuilder;

  /**
   * A method or function that, when invoked, initiates the creation or assembly process
   * to produce an instance of the `LiveSystem`. The returned `LiveSystem` is a fully
   * operational system ready to perform its designated tasks or services.
   *
   * @returns {LiveSystem} An instance of the `LiveSystem` representing the constructed system.
   */
  build: () => LiveSystem;
};

/**
 * Creates and returns a builder for constructing LiveSystem objects.
 * The builder allows the user to configure various properties of a LiveSystem
 * instance through a fluent API.
 *
 * @returns {LiveSystemBuilder} An object providing methods to configure and build a LiveSystem instance.
 *
 * @description
 * The `getLiveSystemBuilder` function initializes a builder object for constructing LiveSystem instances.
 * The builder maintains an internal state that gets updated through its methods. When the `build` method
 * is invoked, the internal state is validated and returned as a fully formed LiveSystem object.
 *
 * The builder provides the following configuration methods:
 * - `withId(value: LiveSystemId)`: Sets the `id` property of the LiveSystem.
 * - `withDescription(value: string)`: Sets the `description` property of the LiveSystem.
 * - `withFractalId(value: Fractal.Id)`: Sets the `fractalId` property of the LiveSystem.
 * - `withComponents(value: LiveSystemComponent[])`: Adds an array of components to the LiveSystem.
 * - `withComponent(value: LiveSystemComponent)`: Adds a single component to the LiveSystem.
 * - `withGenericProvider(value: LiveSystemComponent.Provider)`: Sets the `genericProvider` property of the LiveSystem.
 * - `withParameters(parameters: ComponentParameters): Assigns the provided `parameters` to the `LiveSystem`.
 *
 * Additional builder methods:
 * - `reset()`: Resets the internal state to the default LiveSystem configuration.
 * - `build()`: Validates the internal state and returns a LiveSystem instance. If validation fails, an error is thrown.
 *
 * Validation:
 * The `build` method performs validation on the internal state using the `isValidLiveSystem` function. If validation
 * errors are detected, a `SyntaxError` is thrown containing the list of errors.
 *
 * Lifecycle Operations:
 * The constructed LiveSystem object includes the `deploy` and `destroy` methods:
 * - `deploy(credentials)`: Deploys the LiveSystem using the given credentials.
 * - `destroy(credentials)`: Destroys the LiveSystem using the given credentials and its `id`.
 */
export const getLiveSystemBuilder = (): LiveSystemBuilder => {
  const internalState: LiveSystem = {
    ...DEFAULT_LIVE_SYSTEM,
  };

  const builder = {
    withId: (value: LiveSystemId) => {
      internalState.id = value;
      return builder;
    },
    withFractalId: (value: Fractal.Id) => {
      internalState.fractalId = value;
      return builder;
    },
    withDescription: (value: string) => {
      internalState.description = value;
      return builder;
    },
    withComponents: (value: LiveSystemComponent[]) => {
      if (!internalState.components) {
        internalState.components = [];
      }
      internalState.components.push(...value);
      return builder;
    },
    withComponent: (value: LiveSystemComponent) => {
      if (!internalState.components) {
        internalState.components = [];
      }
      internalState.components.push(value);
      return builder;
    },
    withGenericProvider: (value: LiveSystemComponent.Provider) => {
      internalState.genericProvider = value;
      return builder;
    },
    withParameters: (parameters: LiveSystem.Parameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    reset: (): LiveSystemBuilder => {
      internalState.id = DEFAULT_LIVE_SYSTEM.id;
      internalState.requesterId = DEFAULT_LIVE_SYSTEM.requesterId;
      internalState.fractalId = DEFAULT_LIVE_SYSTEM.fractalId;
      internalState.description = DEFAULT_LIVE_SYSTEM.description;
      internalState.status = DEFAULT_LIVE_SYSTEM.status;
      internalState.statusMessage = DEFAULT_LIVE_SYSTEM.statusMessage;
      internalState.components = DEFAULT_LIVE_SYSTEM.components;
      internalState.genericProvider = DEFAULT_LIVE_SYSTEM.genericProvider;
      internalState.createdAt = DEFAULT_LIVE_SYSTEM.createdAt;
      internalState.updatedAt = DEFAULT_LIVE_SYSTEM.updatedAt;
      return builder;
    },
    build: (): LiveSystem => {
      const validationErrors = isValidLiveSystem(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      return {
        ...internalState,
        deploy: credentials =>
          LiveSystemService.deploy(credentials, internalState),
        destroy: credentials =>
          LiveSystemService.destroy(credentials, internalState.id),
      };
    },
  };

  return builder;
};
