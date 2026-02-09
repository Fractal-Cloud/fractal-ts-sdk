import {Component} from "../../component";

/**
 * Represents a dependency for a blueprint component.
 *
 * This type defines the structure to describe a single dependency within a blueprint system for component-based architectures.
 *
 * Properties:
 * - `id`: The unique identifier of the component that is required as a dependency.
 */
export type BlueprintComponentDependency = {
  id: Component.Id
};
