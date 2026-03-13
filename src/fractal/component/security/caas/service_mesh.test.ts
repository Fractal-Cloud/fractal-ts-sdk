import {describe, expect, it} from 'vitest';
import {ServiceMesh} from './service_mesh';

const BASE_CONFIG = {
  id: 'my-mesh',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Service Mesh',
};

describe('ServiceMesh (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = ServiceMesh.create(BASE_CONFIG);
      expect(component.type.toString()).toBe(
        'Security.CaaS.ServiceMeshsecurity'
      );
    });

    it('should set id, version, and displayName', () => {
      const {component} = ServiceMesh.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-mesh');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Service Mesh');
    });

    it('should set description when provided', () => {
      const {component} = ServiceMesh.create({
        ...BASE_CONFIG,
        description: 'CaaS Service Mesh',
      });
      expect(component.description).toBe('CaaS Service Mesh');
    });

    it('should not set description when omitted', () => {
      const {component} = ServiceMesh.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = ServiceMesh.getBuilder()
        .withId('mesh-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Mesh A')
        .build();

      expect(c.type.toString()).toBe('Security.CaaS.ServiceMeshsecurity');
      expect(c.id.toString()).toBe('mesh-a');
    });
  });
});
