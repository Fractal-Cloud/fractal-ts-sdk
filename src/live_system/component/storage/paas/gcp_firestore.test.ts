import {describe, expect, it} from 'vitest';
import {GcpFirestore} from './gcp_firestore';
import {DocumentDbms} from '../../../../fractal/component/storage/paas/document_dbms';

const BASE_CONFIG = {
  id: 'my-firestore',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Firestore',
};

describe('GcpFirestore', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpFirestore.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.Firestore');
    });

    it('should set provider to GCP', () => {
      const c = GcpFirestore.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set description when provided', () => {
      const c = GcpFirestore.create({
        ...BASE_CONFIG,
        description: 'A Firestore instance',
      });
      expect(c.description).toBe('A Firestore instance');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const node = DocumentDbms.create({
        id: 'bp-docdb',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint DocDB',
      });

      const c = GcpFirestore.satisfy(node.dbms).build();

      expect(c.id.toString()).toBe('bp-docdb');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint DocDB');
    });

    it('should carry dependencies from blueprint', () => {
      const node = DocumentDbms.create({
        id: 'bp-docdb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DocDB',
      });

      const c = GcpFirestore.satisfy(node.dbms).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const node = DocumentDbms.create({
        id: 'bp-docdb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DocDB',
      });

      const c = GcpFirestore.satisfy(node.dbms).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
