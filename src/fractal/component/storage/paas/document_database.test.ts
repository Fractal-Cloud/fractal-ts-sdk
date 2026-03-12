import {describe, expect, it} from 'vitest';
import {DocumentDatabase} from './document_database';

const BASE_CONFIG = {
  id: 'my-docdb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Document DB',
};

describe('DocumentDatabase (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = DocumentDatabase.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.PaaS.DocumentDatabase');
    });

    it('should set id, version, and displayName', () => {
      const {component} = DocumentDatabase.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-docdb');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Document DB');
    });

    it('should set description when provided', () => {
      const {component} = DocumentDatabase.create({
        ...BASE_CONFIG,
        description: 'Document store',
      });
      expect(component.description).toBe('Document store');
    });

    it('should not set description when omitted', () => {
      const {component} = DocumentDatabase.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = DocumentDatabase.getBuilder()
        .withId('docdb-a')
        .withVersion(2, 0, 0)
        .withDisplayName('DocDB A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.DocumentDatabase');
      expect(c.id.toString()).toBe('docdb-a');
    });
  });
});
