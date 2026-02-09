import {BlueprintComponent} from '../../fractal/component';

export namespace LiveSystemComponent {
  export type Status =
    | 'Unknown'
    | 'Mutating'
    | 'Active'
    | 'FailedMutation'
    | 'Error'
    | 'Processing'
    | 'Ready'
    | 'Deleting'
    | 'Stale';
  export type Provider =
    | 'Unknown'
    | 'AWS'
    | 'GCP'
    | 'Azure'
    | 'OCI'
    | 'Hetzner'
    | 'CaaS'
    | 'SaaS';

  // export type Builder = LiveSystemComponentBuilder;
  // export const getBuilder = getLiveSystemComponentBuilder;
}

export type LiveSystemComponent = BlueprintComponent & {
  status: LiveSystemComponent.Status;
  lastUpdated: Date;
  lastOperationRetried: number;
  provider: LiveSystemComponent.Provider;
  lastOperationStatusMessage: string;
  checksum: string;
  //  systemMutationId: LiveSystemMutation.Id;
  errorCode: string;
};
