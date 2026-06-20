import {describe, expect, it} from 'vitest';
import {Function} from './function';

const BASE_CONFIG = {
  id: 'my-fn',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Function',
  sourceArtifact: 'myregistry.azurecr.io/team/fn:1.0',
};

describe('Function (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Function.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('CustomWorkloads.FaaS.Function');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Function.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-fn');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Function');
    });

    it('should serialize the required sourceArtifact param', () => {
      const {component} = Function.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('sourceArtifact'),
      ).toBe('myregistry.azurecr.io/team/fn:1.0');
    });

    it('should not set optional params when omitted', () => {
      const {component} = Function.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('packageType'),
      ).toBeNull();
      expect(component.parameters.getOptionalFieldByName('runtime')).toBeNull();
      expect(component.parameters.getOptionalFieldByName('handler')).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('entryPoint'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('memoryMb'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('timeoutSeconds'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('environment'),
      ).toBeNull();
    });

    it('should serialize all optional params when provided', () => {
      const {component} = Function.create({
        ...BASE_CONFIG,
        description: 'My fn',
        packageType: 'zip',
        runtime: 'java21',
        handler: 'com.example.Handler::handle',
        entryPoint: 'main:handler',
        memoryMb: 256,
        timeoutSeconds: 30,
        environment: {FOO: 'bar'},
      });
      expect(component.description).toBe('My fn');
      expect(component.parameters.getOptionalFieldByName('packageType')).toBe(
        'zip',
      );
      expect(component.parameters.getOptionalFieldByName('runtime')).toBe(
        'java21',
      );
      expect(component.parameters.getOptionalFieldByName('handler')).toBe(
        'com.example.Handler::handle',
      );
      expect(component.parameters.getOptionalFieldByName('entryPoint')).toBe(
        'main:handler',
      );
      expect(component.parameters.getOptionalFieldByName('memoryMb')).toBe(256);
      expect(
        component.parameters.getOptionalFieldByName('timeoutSeconds'),
      ).toBe(30);
      expect(
        component.parameters.getOptionalFieldByName('environment'),
      ).toEqual({FOO: 'bar'});
    });
  });

  describe('getBuilder()', () => {
    it('should build via the fluent builder', () => {
      const component = Function.getBuilder()
        .withId('builder-fn')
        .withVersion(2, 0, 0)
        .withDisplayName('Builder Fn')
        .withSourceArtifact('reg/fn:2.0')
        .withRuntime('python311')
        .build();
      expect(component.type.toString()).toBe('CustomWorkloads.FaaS.Function');
      expect(
        component.parameters.getOptionalFieldByName('sourceArtifact'),
      ).toBe('reg/fn:2.0');
      expect(component.parameters.getOptionalFieldByName('runtime')).toBe(
        'python311',
      );
    });
  });
});
