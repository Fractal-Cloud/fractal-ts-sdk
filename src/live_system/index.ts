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

  /**
   * Controls how deploy() behaves after submitting the live system to the API.
   *
   * - `'fire-and-forget'` (default): submit and return immediately. Errors are
   *   logged to the console but not thrown. Suitable for applications and CLIs
   *   where deployment is a background concern.
   *
   * - `'wait'`: submit then poll until the live system reaches `Active` status.
   *   Throws if deployment fails or if the timeout is exceeded. Suitable for
   *   CI/CD pipelines where the pipeline must not advance until infrastructure
   *   is fully provisioned.
   */
  export type DeployOptions = {
    mode: 'fire-and-forget' | 'wait';
    /** Polling interval in milliseconds. Default: 5000 (5 s). Only used with `mode: 'wait'`. */
    pollIntervalMs?: number;
    /** Maximum time to wait in milliseconds. Default: 600000 (10 min). Only used with `mode: 'wait'`. */
    timeoutMs?: number;
    /**
     * Suppress all SDK log output. Default: false.
     * Set to `true` when a CLI or wrapper layer owns the presentation layer.
     * Only applies to `mode: 'wait'` — `fire-and-forget` is always silent.
     */
    quiet?: boolean;
  };

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
  deploy: (
    credentials: ServiceAccountCredentials,
    options?: LiveSystem.DeployOptions,
  ) => Promise<void>;
  destroy: (credentials: ServiceAccountCredentials) => Promise<void>;
};
