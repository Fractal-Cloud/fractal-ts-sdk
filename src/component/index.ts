import {Version} from '../values/version';
import {TypeBuilder, getTypeBuilder, ComponentType} from './type';
import {GenericParameters, getParametersInstance} from '../values/genericParameters';
import {ComponentLink, getLinkBuilder, LinkBuilder} from './link';
import {ComponentId, ComponentIdBuilder, getComponentIdBuilder} from './id';
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

  export type Parameters = GenericParameters;
  export namespace Parameters {
    export const getInstance = getParametersInstance;
  }

  export type Link = ComponentLink;
  export namespace Link {
    export type Builder = LinkBuilder;
    export type Parameters = GenericParameters;
    export namespace Parameters {
      export const getInstance = getParametersInstance;
    }
    export const getBuilder = getLinkBuilder;
  }

  export type Id = ComponentId;
  export namespace Id {
    export type Builder = ComponentIdBuilder;
    export const getBuilder = getComponentIdBuilder;
  }

  export type OutputFields = ComponentOutputFields;
  export type Builder = ComponentBuilder;
  export type Dependency = ComponentDependency;
  export const getBuilder = getComponentBuilder;
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
