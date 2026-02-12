import {LiveSystemComponent} from './index';
import {
  DEFAULT_BLUEPRINT_COMPONENT,
  isValidBlueprintComponent,
} from '../../fractal/component/entity';
import {Component} from '../../component';
import {Version} from '../../values/version';
import {BlueprintComponentDependency} from '../../fractal/component/dependency';
import {ComponentId} from '../../component/id';
import {ComponentLink} from '../../component/link';
import {BlueprintComponentType} from '../../fractal/component/type';

const DEFAULT_LIVE_SYSTEM_COMPONENT: LiveSystemComponent = {
  ...DEFAULT_BLUEPRINT_COMPONENT,
  status: 'Unknown',
  lastUpdated: new Date(0),
  lastOperationRetried: -1,
  provider: 'Unknown',
  lastOperationStatusMessage: '',
  errorCode: '',
} as const;

export const isValidLiveSystemComponent = (
  component: LiveSystemComponent,
): string[] => isValidBlueprintComponent(component);

/**
 * A builder interface for constructing instances of LiveSystemComponent with a fluent API.
 */
export type LiveSystemComponentBuilder = {
  /**
   * Configures the builder to associate a specific type with the system component.
   *
   * @param {BlueprintComponentType} type - The type of the system component to be set.
   * @returns {LiveSystemComponentBuilder} The builder instance, enabling method chaining.
   */
  withType: (type: BlueprintComponentType) => LiveSystemComponentBuilder;

  /**
   * Associates a specific identifier with a component in the builder pattern.
   *
   * @param {Component.Id} id - The unique identifier to be assigned to the component.
   * @returns {LiveSystemComponentBuilder} The builder instance for further configuration.
   */
  withId: (id: Component.Id) => LiveSystemComponentBuilder;

  /**
   * Sets the version for the LiveSystemComponentBuilder.
   *
   * @param {Version} version - The version to be set for the builder.
   * @returns {LiveSystemComponentBuilder} The updated instance of the builder with the specified version.
   */
  withVersion: (version: Version) => LiveSystemComponentBuilder;

  /**
   * Sets a display name for the component being built.
   *
   * This method allows specifying a human-readable name for the component,
   * which can be useful for debugging or identification purposes.
   *
   * @param {string} displayName - The display name to be assigned to the component.
   * @returns {LiveSystemComponentBuilder} The builder instance, allowing for method chaining.
   */
  withDisplayName: (displayName: string) => LiveSystemComponentBuilder;

  /**
   * Attaches a description to the component builder.
   *
   * @param {string} description - The description to associate with the component.
   * @returns {LiveSystemComponentBuilder} The current instance of the builder.
   */
  withDescription: (description: string) => LiveSystemComponentBuilder;

  /**
   * Configures the LiveSystemComponentBuilder with the specified parameters.
   *
   * @param {Component.Parameters} parameters - The parameters to be applied to the component builder.
   * @returns {LiveSystemComponentBuilder} The instance of the builder with the updated configuration.
   */
  withParameters: (
    parameters: Component.Parameters,
  ) => LiveSystemComponentBuilder;

  /**
   * Configures the component builder with a collection of links.
   * This method allows adding a list of links to the component being built,
   * enabling navigation or connectivity between different components or resources within the system.
   *
   * @param {Component.Link[]} links - An array of links to include in the component.
   * @returns {LiveSystemComponentBuilder} The current instance of the component builder, updated with the provided links.
   */
  withLinks: (links: Component.Link[]) => LiveSystemComponentBuilder;

  /**
   * A function that initializes a LiveSystemComponentBuilder with the specified dependencies.
   *
   * @param {BlueprintComponentDependency[]} dependencies - An array of blueprint component dependencies required for construction.
   * @returns {LiveSystemComponentBuilder} A builder instance configured with the provided dependencies.
   */
  withDependencies: (
    dependencies: BlueprintComponentDependency[],
  ) => LiveSystemComponentBuilder;

  /**
   * Sets the locked state of the component.
   *
   * @param {boolean} value - Indicates whether the component should be locked.
   * @returns {LiveSystemComponentBuilder} The builder instance for chaining additional configuration methods.
   */
  withIsLocked: (value: boolean) => LiveSystemComponentBuilder;

  /**
   * Configures the system component builder to recreate the component upon failure, based on the specified flag.
   *
   * @param {boolean} value - A boolean indicating whether the component should be recreated on failure.
   *                          Passing `true` enables recreation on failure, while `false` disables it.
   * @returns {LiveSystemComponentBuilder} The current instance of the LiveSystemComponentBuilder
   *                                        for method chaining.
   */
  withRecreateOnFailure: (value: boolean) => LiveSystemComponentBuilder;

  /**
   * Configures the LiveSystemComponentBuilder to use the specified provider.
   *
   * @param {LiveSystemComponent.Provider} value - The provider to associate with the LiveSystemComponentBuilder.
   * @returns {LiveSystemComponentBuilder} The updated instance of LiveSystemComponentBuilder with the specified provider.
   */
  withProvider: (
    value: LiveSystemComponent.Provider,
  ) => LiveSystemComponentBuilder;

  /**
   * Resets the current configuration of the LiveSystemComponentBuilder instance
   * to its initial state.
   *
   * @returns {LiveSystemComponentBuilder} A reference to the same builder instance,
   * allowing for method chaining.
   */
  reset: () => LiveSystemComponentBuilder;

  /**
   * Function that generates and returns a LiveSystemComponent instance.
   * The implementation defines the specific behavior and structure
   * of the returned LiveSystemComponent.
   *
   * @returns {LiveSystemComponent} A new instance of a LiveSystemComponent.
   */
  build: () => LiveSystemComponent;
};

export const getLiveSystemComponentBuilder = (): LiveSystemComponentBuilder => {
  const internalState: LiveSystemComponent = {
    ...DEFAULT_LIVE_SYSTEM_COMPONENT,
  };

  const builder = {
    withType: (type: BlueprintComponentType) => {
      internalState.type = type;
      return builder;
    },
    withId: (id: ComponentId) => {
      internalState.id = id;
      return builder;
    },
    withVersion: (version: Version) => {
      internalState.version = version;
      return builder;
    },
    withIsLocked: (value: boolean) => {
      internalState.isLocked = value;
      return builder;
    },
    withRecreateOnFailure: (value: boolean) => {
      internalState.recreateOnFailure = value;
      return builder;
    },
    withProvider: (value: LiveSystemComponent.Provider) => {
      internalState.provider = value;
      return builder;
    },
    withDisplayName: (displayName: string) => {
      internalState.displayName = displayName;
      return builder;
    },
    withDescription: (description: string) => {
      internalState.description = description;
      return builder;
    },
    withParameters: (parameters: Component.Parameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    withLinks: (links: ComponentLink[]) => {
      internalState.links = links;
      return builder;
    },
    withDependencies: (dependencies: BlueprintComponentDependency[]) => {
      internalState.dependencies = dependencies;
      return builder;
    },
    reset: () => {
      internalState.type = DEFAULT_LIVE_SYSTEM_COMPONENT.type;
      internalState.id = DEFAULT_LIVE_SYSTEM_COMPONENT.id;
      internalState.version = DEFAULT_LIVE_SYSTEM_COMPONENT.version;
      internalState.displayName = DEFAULT_LIVE_SYSTEM_COMPONENT.displayName;
      internalState.description = DEFAULT_LIVE_SYSTEM_COMPONENT.description;
      internalState.parameters = DEFAULT_LIVE_SYSTEM_COMPONENT.parameters;
      internalState.links = DEFAULT_LIVE_SYSTEM_COMPONENT.links;
      internalState.dependencies = DEFAULT_LIVE_SYSTEM_COMPONENT.dependencies;
      internalState.isLocked = DEFAULT_LIVE_SYSTEM_COMPONENT.isLocked;
      internalState.provider = DEFAULT_LIVE_SYSTEM_COMPONENT.provider;
      internalState.recreateOnFailure =
        DEFAULT_LIVE_SYSTEM_COMPONENT.recreateOnFailure;
      return builder;
    },
    build: (): LiveSystemComponent => {
      const validationErrors = isValidLiveSystemComponent(internalState);
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
