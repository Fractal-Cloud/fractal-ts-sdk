import {Version} from '../values/version';
import {TypeBuilder, getTypeBuilder, ComponentType} from './type';
import {ComponentParameters, getParametersInstance} from './parameters';
import {ComponentLink, getLinkBuilder, LinkBuilder} from './link';
import {ComponentId, isValidId} from './id';
import {
  ComponentBuilder,
  ComponentOutputFields,
  getComponentBuilder,
} from './entity';
import {ComponentDependency} from './dependency';

export namespace Component {
  export type Type = ComponentType;
  export namespace Type {
    export type Builder = TypeBuilder;
    export const getBuilder = getTypeBuilder;
  }

  export type Parameters = ComponentParameters;
  export namespace Parameters {
    export const getInstance = getParametersInstance;
  }

  export type Link = ComponentLink;
  export namespace Link {
    export type Builder = LinkBuilder;
    export const getBuilder = getLinkBuilder;
  }

  export type Id = ComponentId;
  export namespace Id {
    export const isValid = isValidId;
  }

  export type OutputFields = ComponentOutputFields;
  export type Builder = ComponentBuilder;
  export const getBuilder = getComponentBuilder;
  export type Dependency = ComponentDependency;
}

export type Component = {
  type: Component.Type;
  id: Component.Id;
  version: Version;
  displayName: string;
  description: string;
  parameters: Component.Parameters;
  outputFields: Component.OutputFields;
  links: Component.Link[];
  dependencies: Component.Dependency[];
};
