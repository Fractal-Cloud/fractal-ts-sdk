/**
 * basic_storage.test.ts
 *
 * Integration tests for the basic_storage sample pattern.
 * Verifies the blueprint builds correctly and each provider's live system
 * maps components with the right types, dependencies, and parameters.
 */

import {describe, expect, it} from 'vitest';
import {FilesAndBlobs} from '../fractal/component/storage/paas/files_and_blobs';
import {RelationalDbms} from '../fractal/component/storage/paas/relational_dbms';
import {RelationalDatabase} from '../fractal/component/storage/paas/relational_database';
import {AwsS3} from '../live_system/component/storage/paas/aws_s3';
import {AzureStorageAccount} from '../live_system/component/storage/paas/azure_storage_account';
import {AzurePostgreSqlDbms} from '../live_system/component/storage/paas/azure_postgresql_dbms';
import {AzurePostgreSqlDatabase} from '../live_system/component/storage/paas/azure_postgresql_database';
import {GcpCloudStorage} from '../live_system/component/storage/paas/gcp_cloud_storage';
import {GcpPostgreSqlDbms} from '../live_system/component/storage/paas/gcp_postgresql_dbms';
import {GcpPostgreSqlDatabase} from '../live_system/component/storage/paas/gcp_postgresql_database';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const appDb = RelationalDatabase.create({
  id: 'app-db',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Application Database',
  description: 'Primary application database with UTF-8 encoding',
  collation: 'en_US.utf8',
  charset: 'UTF8',
});

const dbms = RelationalDbms.create({
  id: 'main-dbms',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Main PostgreSQL DBMS',
  description: 'PostgreSQL 15 server hosting the application database',
  dbVersion: '15',
}).withDatabases([appDb]);

const appStorage = FilesAndBlobs.create({
  id: 'app-storage',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Application Storage',
  description: 'Object storage for application uploads and static assets',
});

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_storage blueprint', () => {
  it('should create RelationalDbms with correct type and dbVersion', () => {
    expect(dbms.dbms.type.toString()).toBe('Storage.PaaS.RelationalDbms');
    expect(dbms.dbms.id.toString()).toBe('main-dbms');
    expect(dbms.dbms.parameters.getOptionalFieldByName('version')).toBe('15');
  });

  it('should auto-wire DBMS dependency into the database', () => {
    expect(dbms.databases).toHaveLength(1);
    const db = dbms.databases[0];
    expect(db.component.type.toString()).toBe(
      'Storage.PaaS.RelationalDatabase',
    );
    expect(db.component.id.toString()).toBe('app-db');

    const depIds = db.component.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('main-dbms');
  });

  it('should set collation and charset on the database', () => {
    const db = dbms.databases[0];
    expect(db.component.parameters.getOptionalFieldByName('collation')).toBe(
      'en_US.utf8',
    );
    expect(db.component.parameters.getOptionalFieldByName('charset')).toBe(
      'UTF8',
    );
  });

  it('should create FilesAndBlobs with correct type', () => {
    expect(appStorage.component.type.toString()).toBe(
      'Storage.PaaS.FilesAndBlobs',
    );
    expect(appStorage.component.id.toString()).toBe('app-storage');
  });

  it('should have no dependencies on FilesAndBlobs', () => {
    expect(appStorage.component.dependencies).toHaveLength(0);
  });
});

// ── AWS live system tests ───────────────────────────────────────────────────

describe('basic_storage AWS live system', () => {
  it('should satisfy FilesAndBlobs with AwsS3', () => {
    const s3 = AwsS3.satisfy(appStorage.component)
      .withBucket('my-app-bucket')
      .withVersioningEnabled(true)
      .build();

    expect(s3.type.toString()).toBe('Storage.PaaS.S3');
    expect(s3.provider).toBe('AWS');
    expect(s3.id.toString()).toBe('app-storage');
    expect(s3.displayName).toBe('Application Storage');
    expect(s3.parameters.getOptionalFieldByName('bucket')).toBe(
      'my-app-bucket',
    );
    expect(s3.parameters.getOptionalFieldByName('versioningEnabled')).toBe(
      true,
    );
  });

  it('should carry description from blueprint', () => {
    const s3 = AwsS3.satisfy(appStorage.component).build();
    expect(s3.description).toBe(
      'Object storage for application uploads and static assets',
    );
  });
});

// ── Azure live system tests ─────────────────────────────────────────────────

describe('basic_storage Azure live system', () => {
  it('should satisfy FilesAndBlobs with AzureStorageAccount', () => {
    const sa = AzureStorageAccount.satisfy(appStorage.component)
      .withAzureRegion('westeurope')
      .withAzureResourceGroup('my-rg')
      .withKind('StorageV2')
      .withSku('Standard_LRS')
      .build();

    expect(sa.type.toString()).toBe('Storage.PaaS.StorageAccount');
    expect(sa.provider).toBe('Azure');
    expect(sa.id.toString()).toBe('app-storage');
    expect(sa.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(sa.parameters.getOptionalFieldByName('kind')).toBe('StorageV2');
  });

  it('should satisfy RelationalDbms with AzurePostgreSqlDbms and carry dbVersion', () => {
    const azureDbms = AzurePostgreSqlDbms.satisfy(dbms.dbms)
      .withAzureRegion('westeurope')
      .withAzureResourceGroup('my-rg')
      .withSkuName('B_Standard_B1ms')
      .withStorageGb(32)
      .build();

    expect(azureDbms.type.toString()).toBe('Storage.PaaS.PostgreSqlDbms');
    expect(azureDbms.provider).toBe('Azure');
    expect(azureDbms.id.toString()).toBe('main-dbms');
    // dbVersion carried from blueprint
    expect(azureDbms.parameters.getOptionalFieldByName('version')).toBe('15');
    // vendor-specific params
    expect(azureDbms.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(azureDbms.parameters.getOptionalFieldByName('skuName')).toBe(
      'B_Standard_B1ms',
    );
    expect(azureDbms.parameters.getOptionalFieldByName('storageGb')).toBe(32);
  });

  it('should satisfy RelationalDatabase with AzurePostgreSqlDatabase and carry collation + charset', () => {
    const db = dbms.databases[0];
    const azureDb = AzurePostgreSqlDatabase.satisfy(db.component).build();

    expect(azureDb.type.toString()).toBe('Storage.PaaS.PostgreSqlDatabase');
    expect(azureDb.provider).toBe('Azure');
    expect(azureDb.id.toString()).toBe('app-db');
    // collation + charset carried from blueprint
    expect(azureDb.parameters.getOptionalFieldByName('collation')).toBe(
      'en_US.utf8',
    );
    expect(azureDb.parameters.getOptionalFieldByName('charset')).toBe('UTF8');
  });

  it('should carry DBMS dependency into AzurePostgreSqlDatabase', () => {
    const db = dbms.databases[0];
    const azureDb = AzurePostgreSqlDatabase.satisfy(db.component).build();

    const depIds = azureDb.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('main-dbms');
  });
});

// ── GCP live system tests ───────────────────────────────────────────────────

describe('basic_storage GCP live system', () => {
  it('should satisfy FilesAndBlobs with GcpCloudStorage', () => {
    const gcs = GcpCloudStorage.satisfy(appStorage.component)
      .withRegion('europe-west1')
      .withStorageClass('STANDARD')
      .withVersioningEnabled(true)
      .build();

    expect(gcs.type.toString()).toBe('Storage.PaaS.CloudStorage');
    expect(gcs.provider).toBe('GCP');
    expect(gcs.id.toString()).toBe('app-storage');
    expect(gcs.parameters.getOptionalFieldByName('region')).toBe(
      'europe-west1',
    );
    expect(gcs.parameters.getOptionalFieldByName('storageClass')).toBe(
      'STANDARD',
    );
    expect(gcs.parameters.getOptionalFieldByName('versioningEnabled')).toBe(
      true,
    );
  });

  it('should satisfy RelationalDbms with GcpPostgreSqlDbms and carry dbVersion', () => {
    const gcpDbms = GcpPostgreSqlDbms.satisfy(dbms.dbms)
      .withRegion('europe-west1')
      .withTier('db-f1-micro')
      .build();

    expect(gcpDbms.type.toString()).toBe('Storage.PaaS.PostgreSqlDbms');
    expect(gcpDbms.provider).toBe('GCP');
    expect(gcpDbms.id.toString()).toBe('main-dbms');
    // dbVersion carried from blueprint
    expect(gcpDbms.parameters.getOptionalFieldByName('version')).toBe('15');
    // vendor-specific params
    expect(gcpDbms.parameters.getOptionalFieldByName('region')).toBe(
      'europe-west1',
    );
    expect(gcpDbms.parameters.getOptionalFieldByName('tier')).toBe(
      'db-f1-micro',
    );
  });

  it('should satisfy RelationalDatabase with GcpPostgreSqlDatabase and carry collation + charset', () => {
    const db = dbms.databases[0];
    const gcpDb = GcpPostgreSqlDatabase.satisfy(db.component).build();

    expect(gcpDb.type.toString()).toBe('Storage.PaaS.PostgreSqlDatabase');
    expect(gcpDb.provider).toBe('GCP');
    expect(gcpDb.id.toString()).toBe('app-db');
    // collation + charset carried from blueprint
    expect(gcpDb.parameters.getOptionalFieldByName('collation')).toBe(
      'en_US.utf8',
    );
    expect(gcpDb.parameters.getOptionalFieldByName('charset')).toBe('UTF8');
  });

  it('should carry DBMS dependency into GcpPostgreSqlDatabase', () => {
    const db = dbms.databases[0];
    const gcpDb = GcpPostgreSqlDatabase.satisfy(db.component).build();

    const depIds = gcpDb.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('main-dbms');
  });
});
