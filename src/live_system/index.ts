import {getLiveSystemIdBuilder, LiveSystemId, LiveSystemIdBuilder} from './id';
import {LiveSystemComponent} from './component';
import {
  getLiveSystemComponentBuilder,
  LiveSystemComponentBuilder,
} from './component/entity';
import {ServiceAccountCredentials} from '../values/service_account_credentials';
import {Fractal} from '../fractal';
import {GenericParameters} from '../values/generic_parameters';
import {Environment} from '../environment';
import {getLiveSystemBuilder, LiveSystemBuilder} from './entity';

export namespace LiveSystem {
  export type Status =
    | 'Unknown'
    | 'Mutating'
    | 'Active'
    | 'FailedMutation'
    | 'Processing'
    | 'Error'
    | 'Ready'
    | 'Deleting'
    | 'Stale';

  export type Id = LiveSystemId;
  export namespace Id {
    export type Builder = LiveSystemIdBuilder;
    export const getBuilder = getLiveSystemIdBuilder;
  }

  export type Component = LiveSystemComponent;
  export namespace Component {
    export type Builder = LiveSystemComponentBuilder;
    export const getBuilder = getLiveSystemComponentBuilder;
  }

  export type Parameters = GenericParameters;
  export type Builder = LiveSystemBuilder;
  export const getBuilder = getLiveSystemBuilder;
}

export type LiveSystem = {
  id: LiveSystemId;
  requesterId: string;
  fractalId: Fractal.Id;
  description: string;
  status: LiveSystem.Status;
  statusMessage: string;
  components: LiveSystemComponent[];
  genericProvider: LiveSystemComponent.Provider;
  parameters: LiveSystem.Parameters;
  environment: Environment;
  createdAt: Date;
  updatedAt: Date;
  deploy: (credentials: ServiceAccountCredentials) => Promise<void>;
  destroy: (credentials: ServiceAccountCredentials) => Promise<void>;
};
