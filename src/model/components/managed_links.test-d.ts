/**
 * managed_links.test-d.ts — the link settings of the managed-service
 * components take the catalog's (aria-spec) vocabulary, and nothing else.
 */
import type {KeyValueDbmsLink} from './key_value_dbms_link';
import type {DocumentDbmsLink} from './document_dbms_link';
import type {DataCatalogLink} from './data_catalog_link';
import type {DataCatalogTableLink} from './data_catalog_table_link';
import type {HaLayout} from './managed/ha_layout';

export const keyValue = {
  accessMode: 'readWrite',
  keyPattern: 'session:*',
} satisfies KeyValueDbmsLink;
export const documents = {accessMode: 'readWrite'} satisfies DocumentDbmsLink;
export const catalog = {
  accessMode: 'read',
  resource: 'pilot.sales',
} satisfies DataCatalogLink;
export const table = {accessMode: 'write'} satisfies DataCatalogTableLink;
export const layout = {replicas: 3} satisfies HaLayout;

// The SDK's older link spelling is not the catalog's.
// @ts-expect-error 'read-write' is not an accessMode
export const legacy = {accessMode: 'read-write'} satisfies KeyValueDbmsLink;
// @ts-expect-error a link names accessMode, not access
export const access = {access: 'read'} satisfies DataCatalogTableLink;
// @ts-expect-error a layout names its replicas
export const noReplicas = {spreadZones: true} satisfies HaLayout;
