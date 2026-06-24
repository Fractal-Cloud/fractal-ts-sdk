import {
  BlueprintComponentType,
  getBlueprintComponentTypeBuilder,
  BlueprintComponentTypeBuilder,
} from './type';
import {Component} from '../../component';
import {BlueprintComponentDependency} from './dependency';
import {
  BlueprintComponentBuilder,
  getBlueprintComponentBuilder,
} from './entity';
import type {BlueprintComponentService} from './service';

export namespace BlueprintComponent {
  export type Type = BlueprintComponentType;
  export namespace Type {
    export type Builder = BlueprintComponentTypeBuilder;
    export const getBuilder = getBlueprintComponentTypeBuilder;
  }

  export type Id = Component.Id;
  export namespace Id {
    export type Builder = Component.Id.Builder;
    export const getBuilder = Component.Id.getBuilder;
  }

  export type Builder = BlueprintComponentBuilder;
  export type Dependency = BlueprintComponentDependency;
  export type Service = BlueprintComponentService;
  export const getBuilder = getBlueprintComponentBuilder;
}

export type BlueprintComponent = Omit<Component, 'type' | 'dependencies'> & {
  type: BlueprintComponent.Type;
  dependencies: BlueprintComponent.Dependency[];
  isLocked: boolean;
  recreateOnFailure: boolean;
  /**
   * Candidate Services (delivery-model-specific) carrying the offers that can
   * satisfy this component. Optional — absent on leaf/offer-coupled components.
   */
  services?: BlueprintComponent.Service[];
};
