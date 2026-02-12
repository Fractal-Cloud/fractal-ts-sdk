import {
  BoundedContextIdBuilder,
  getBoundedContextIdBuilder,
} from '../bounded_context/id';
import {EnvironmentId} from './id';
import {GenericParameters} from '../values/generic_parameters';
import {EnvironmentBuilder, getEnvironmentBuilder} from './entity';

export namespace Environment {
  export type Id = EnvironmentId;
  export namespace Id {
    export type Builder = BoundedContextIdBuilder;
    export const getBuilder = getBoundedContextIdBuilder;
  }

  export type Parameters = GenericParameters;
  export type Builder = EnvironmentBuilder;
  export const getBuilder = getEnvironmentBuilder;
}

export type Environment = {
  id: Environment.Id;
  parameters: Environment.Parameters;
};
