import {describe, expect, it} from 'vitest';
import {FilesAndBlobs} from './files_and_blobs';

const BASE_CONFIG = {
  id: 'my-storage',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Storage',
};

describe('FilesAndBlobs (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = FilesAndBlobs.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.PaaS.FilesAndBlobs');
    });

    it('should set id, version, and displayName', () => {
      const {component} = FilesAndBlobs.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-storage');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Storage');
    });

    it('should set description when provided', () => {
      const {component} = FilesAndBlobs.create({
        ...BASE_CONFIG,
        description: 'Blob storage',
      });
      expect(component.description).toBe('Blob storage');
    });

    it('should not set description when omitted', () => {
      const {component} = FilesAndBlobs.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = FilesAndBlobs.getBuilder()
        .withId('storage-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Storage A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.FilesAndBlobs');
      expect(c.id.toString()).toBe('storage-a');
    });
  });
});
