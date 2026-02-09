import {BlueprintComponentType, getBlueprintComponentTypeBuilder, BlueprintComponentTypeBuilder} from "./type";
import {Component} from "../../component";
import {BlueprintComponentDependency} from "./dependency";
import {BlueprintComponentBuilder, getBlueprintComponentBuilder} from "./entity";

export namespace BlueprintComponent {
  export type Type = BlueprintComponentType;
  export namespace Type {
    export type Builder = BlueprintComponentTypeBuilder;
    export const getBuilder = getBlueprintComponentTypeBuilder;
  }

  export type Builder = BlueprintComponentBuilder;
  export type Dependency = BlueprintComponentDependency;
  export const getBuilder = getBlueprintComponentBuilder;
}

export type BlueprintComponent = Omit<Component, 'type' | 'dependencies'> & {
  type: BlueprintComponent.Type;
  dependencies: BlueprintComponent.Dependency[];
  isLocked: boolean;
  recreateOnFailure: boolean;
};
