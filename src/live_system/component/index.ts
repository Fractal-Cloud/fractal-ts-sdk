import {BlueprintComponent} from '../../fractal/component';
import {
  getLiveSystemComponentBuilder,
  LiveSystemComponentBuilder,
} from './entity';

export namespace LiveSystemComponent {
  export type Status =
    | 'Unknown'
    | 'Instantiating'
    | 'Active'
    | 'Failed'
    | 'Mutating'
    | 'Deleting'
    | 'Cancelled';
  export type Provider =
    | 'Unknown'
    | 'AWS'
    | 'GCP'
    | 'Azure'
    | 'OCI'
    | 'Hetzner'
    | 'CaaS'
    | 'SaaS';

  export type Builder = LiveSystemComponentBuilder;
  export const getBuilder = getLiveSystemComponentBuilder;
}

export type LiveSystemComponent = BlueprintComponent & {
  status: LiveSystemComponent.Status;
  lastUpdated: Date;
  lastOperationRetried: number;
  provider: LiveSystemComponent.Provider;
  lastOperationStatusMessage: string;
  errorCode: string;
};
