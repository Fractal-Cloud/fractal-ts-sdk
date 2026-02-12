import {Environment} from './index';
import {DEFAULT_ENVIRONMENT_ID, isValidEnvironmentId} from './id';
import {getParametersInstance} from '../values/generic_parameters';
import {Component} from '../component';

export const DEFAULT_ENVIRONMENT: Environment = {
  id: DEFAULT_ENVIRONMENT_ID,
  parameters: getParametersInstance(),
};

export const isValidEnvironment = (environment: Environment): string[] =>
  isValidEnvironmentId(environment.id);

export type EnvironmentBuilder = {
  withId: (id: Environment.Id) => EnvironmentBuilder;
  withParameters: (parameters: Environment.Parameters) => EnvironmentBuilder;
  reset: () => EnvironmentBuilder;
  build: () => Environment;
};

export const getEnvironmentBuilder = (): EnvironmentBuilder => {
  const internalState: Environment = {
    ...DEFAULT_ENVIRONMENT,
  };

  const builder = {
    withId: (id: Environment.Id) => {
      internalState.id = id;
      return builder;
    },
    withParameters: (parameters: Component.Parameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    reset: () => {
      internalState.id = DEFAULT_ENVIRONMENT.id;
      internalState.parameters = DEFAULT_ENVIRONMENT.parameters;
      return builder;
    },
    build: (): Environment => {
      const validationErrors = isValidEnvironment(internalState);
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
