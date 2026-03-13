import {describe, expect, it} from 'vitest';
import {Datalake} from './datalake';

const BASE_CONFIG = {
  id: 'my-datalake',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Datalake',
};

describe('Datalake (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Datalake.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('BigData.PaaS.Datalake');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Datalake.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-datalake');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Datalake');
    });

    it('should set description when provided', () => {
      const {component} = Datalake.create({
        ...BASE_CONFIG,
        description: 'Enterprise datalake',
      });
      expect(component.description).toBe('Enterprise datalake');
    });

    it('should not set description when omitted', () => {
      const {component} = Datalake.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = Datalake.getBuilder()
        .withId('lake-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Lake A')
        .build();

      expect(c.type.toString()).toBe('BigData.PaaS.Datalake');
      expect(c.id.toString()).toBe('lake-a');
    });
  });
});
