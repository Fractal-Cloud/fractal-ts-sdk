import {describe, expect, it} from 'vitest';
import {GcpFirestoreCollection} from './gcp_firestore_collection';
import {DocumentDatabase} from '../../../../fractal/component/storage/paas/document_database';

const BASE_CONFIG = {
  id: 'my-collection',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Collection',
};

describe('GcpFirestoreCollection', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpFirestoreCollection.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.Collection');
    });

    it('should set provider to GCP', () => {
      const c = GcpFirestoreCollection.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set description when provided', () => {
      const c = GcpFirestoreCollection.create({
        ...BASE_CONFIG,
        description: 'A Firestore collection',
      });
      expect(c.description).toBe('A Firestore collection');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = DocumentDatabase.create({
        id: 'bp-docdb-coll',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Collection',
      });

      const c = GcpFirestoreCollection.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-docdb-coll');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Collection');
    });

    it('should carry dependencies from blueprint', () => {
      const {component: blueprint} = DocumentDatabase.create({
        id: 'bp-docdb-coll',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Collection',
      });

      const c = GcpFirestoreCollection.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const {component: blueprint} = DocumentDatabase.create({
        id: 'bp-docdb-coll',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Collection',
      });

      const c = GcpFirestoreCollection.satisfy(blueprint).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
