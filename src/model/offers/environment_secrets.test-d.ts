/**
 * Type-level assertions for `withEnvironmentSecrets` (see storage.test-d.ts
 * for why these are not in a `.test.ts`): only an offer whose contract can
 * access environment secrets has it.
 */
import {
  PlainFunction,
  SecretReader,
} from './contract/fixtures/secret_access_offers';
import {AwsLb} from './network_and_compute';
import {AwsRdsPostgresDbms} from './storage';

SecretReader({}).withEnvironmentSecrets(['db-password']);
// Chained selections replace each other and stay selectable.
SecretReader({handler: 'main'})
  .withEnvironmentSecrets(['a'])
  .withEnvironmentSecrets(['b']);
// The key is also the contract's config key.
SecretReader({environmentSecretShortNames: ['db-password']});

// @ts-expect-error an offer whose contract cannot access secrets has no selection.
PlainFunction({}).withEnvironmentSecrets(['db-password']);
// @ts-expect-error …nor any config key for it.
PlainFunction({environmentSecretShortNames: ['db-password']});
// @ts-expect-error a load balancer cannot access secrets.
AwsLb({}).withEnvironmentSecrets(['db-password']);
// @ts-expect-error no DBMS can access secrets (D6).
AwsRdsPostgresDbms({}).withEnvironmentSecrets(['db-password']);
// @ts-expect-error short names, not secret references.
SecretReader({}).withEnvironmentSecrets([{$envSecret: 'db-password'}]);
