import {ComponentType} from './type';

/**
 * Represents a dependency with a specified type.
 *
 * This type can be used to define a specific dependency structure
 * where the `type` property indicates the category or classification
 * of the dependency.
 *
 * @typedef {Object} ComponentDependency
 * @property {Type} type - Specifies the type of the dependency.
 */
export type ComponentDependency = {
  type: ComponentType;
};
