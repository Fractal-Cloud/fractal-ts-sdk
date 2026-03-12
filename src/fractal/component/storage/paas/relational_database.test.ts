import {describe, expect, it} from 'vitest';
import {RelationalDatabase} from './relational_database';

const BASE_CONFIG = {
  id: 'my-db',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Database',
};

describe('RelationalDatabase (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = RelationalDatabase.create(BASE_CONFIG);
      expect(component.type.toString()).toBe(
        'Storage.PaaS.RelationalDatabase',
      );
    });

    it('should set id, version, and displayName', () => {
      const {component} = RelationalDatabase.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-db');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Database');
    });

    it('should set description when provided', () => {
      const {component} = RelationalDatabase.create({
        ...BASE_CONFIG,
        description: 'Primary database',
      });
      expect(component.description).toBe('Primary database');
    });

    it('should not set description when omitted', () => {
      const {component} = RelationalDatabase.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should set collation and charset parameters', () => {
      const {component} = RelationalDatabase.create({
        ...BASE_CONFIG,
        collation: 'en_US.utf8',
        charset: 'UTF8',
      });
      expect(
        component.parameters.getOptionalFieldByName('collation'),
      ).toBe('en_US.utf8');
      expect(component.parameters.getOptionalFieldByName('charset')).toBe(
        'UTF8',
      );
    });

    it('should not set collation and charset when omitted', () => {
      const {component} = RelationalDatabase.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('collation'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('charset'),
      ).toBeNull();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = RelationalDatabase.getBuilder()
        .withId('db-a')
        .withVersion(2, 0, 0)
        .withDisplayName('DB A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.RelationalDatabase');
      expect(c.id.toString()).toBe('db-a');
    });

    it('should support fluent collation and charset', () => {
      const c = RelationalDatabase.getBuilder()
        .withId('db-b')
        .withVersion(1, 0, 0)
        .withDisplayName('DB B')
        .withCollation('SQL_Latin1_General_CP1_CI_AS')
        .withCharset('latin1')
        .build();

      expect(
        c.parameters.getOptionalFieldByName('collation'),
      ).toBe('SQL_Latin1_General_CP1_CI_AS');
      expect(c.parameters.getOptionalFieldByName('charset')).toBe('latin1');
    });
  });
});
