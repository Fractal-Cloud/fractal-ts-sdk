/**
 * contract_key_aliases.test.ts — keys an agent declares twice, a canonical key
 * and an older spelling it still reads, are generated as ONE key with a
 * deprecated alias (contracts/key-aliases.json), so a config offers only the
 * canonical key and a neutral guardrail lands on it.
 */
import {describe, expect, it} from 'vitest';
import {createFractal} from './core';
import {ObjectStorage} from './components/storage';
import {Datalake} from './components/big_data';
import {AwsS3} from './offers/storage';
import {AwsS3Datalake} from './offers/big_data';
import {Storage_PaaS_AwsS3, Storage_PaaS_S3} from './offers/generated/storage';
import {
  BigData_PaaS_AwsS3Datalake,
  BigData_PaaS_S3,
} from './offers/generated/big_data';
import {Messaging_PaaS_EventHubNamespace} from './offers/generated/messaging';

const environment = {};
const boundedContextId = {id: 'aliases'};

describe('generated contracts with a key declared twice', () => {
  it.each([
    [
      Storage_PaaS_AwsS3.offerType,
      'versioning',
      'versioningEnabled',
      Storage_PaaS_AwsS3,
    ],
    [
      Storage_PaaS_S3.offerType,
      'versioning',
      'versioningEnabled',
      Storage_PaaS_S3,
    ],
    [
      BigData_PaaS_AwsS3Datalake.offerType,
      'versioning',
      'versioningEnabled',
      BigData_PaaS_AwsS3Datalake,
    ],
    [
      BigData_PaaS_S3.offerType,
      'versioning',
      'versioningEnabled',
      BigData_PaaS_S3,
    ],
    [
      Messaging_PaaS_EventHubNamespace.offerType,
      'disableLocalAuth',
      'diableLocalAuth',
      Messaging_PaaS_EventHubNamespace,
    ],
  ] as const)(
    '%s declares %s, with %s only as its deprecated alias',
    (_offerType, canonical, alias, contract) => {
      const params = contract.params as Record<
        string,
        {aliases?: readonly {key: string; deprecated?: boolean}[]}
      >;
      expect(params).not.toHaveProperty(alias);
      expect(params[canonical]?.aliases).toContainEqual({
        deprecated: true,
        key: alias,
      });
    },
  );
});

describe('versioningEnabled on an S3 bucket', () => {
  it('reaches the AWS agent under its canonical key, versioning', () => {
    const [bucket] = createFractal({
      id: 'versioned',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        b: bp.add(ObjectStorage({id: 'b'}).withVersioningEnabled(true)),
      }),
    }).toLiveSystem({
      name: 'v',
      environment,
      select: {b: AwsS3({})},
    }).components;
    expect(bucket.parameters).toEqual({versioning: true});
  });

  it('reaches the AWS agent under versioning for a data lake too', () => {
    const [lake] = createFractal({
      id: 'versioned-lake',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        l: bp.add(Datalake({id: 'l'}).withVersioningEnabled(false)),
      }),
    }).toLiveSystem({
      name: 'v',
      environment,
      select: {l: AwsS3Datalake({bucket: 'acme-lake'})},
    }).components;
    expect(lake.parameters).toMatchObject({versioning: false});
    expect(lake.parameters).not.toHaveProperty('versioningEnabled');
  });
});
