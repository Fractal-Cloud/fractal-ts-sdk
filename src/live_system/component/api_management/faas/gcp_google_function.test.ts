import {describe, expect, it} from 'vitest';
import {GoogleFunction} from './gcp_google_function';
import {Function} from '../../../../fractal/component/custom_workloads/faas/function';

const BASE_CONFIG = {
  id: 'my-fn',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Function',
  sourceArtifact: 'europe-west1-docker.pkg.dev/proj/repo/fn:1.0',
  entryPoint: 'com.example.Handler',
};

describe('GoogleFunction', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GoogleFunction.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.FaaS.GoogleFunction');
    });

    it('should set provider to GCP', () => {
      const c = GoogleFunction.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should serialize the required sourceArtifact and entryPoint params', () => {
      const c = GoogleFunction.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        'europe-west1-docker.pkg.dev/proj/repo/fn:1.0',
      );
      expect(c.parameters.getOptionalFieldByName('entryPoint')).toBe(
        'com.example.Handler',
      );
    });

    it('should serialize optional params when provided', () => {
      const c = GoogleFunction.create({
        ...BASE_CONFIG,
        location: 'europe-west4',
        runtime: 'java21',
      });
      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'europe-west4',
      );
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('java21');
    });
  });

  describe('satisfy()', () => {
    it('should copy structural fields and carry the unified params from the blueprint', () => {
      const fn = Function.create({
        id: 'bp-fn',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Fn',
        description: 'A function',
        sourceArtifact: 'europe-west1-docker.pkg.dev/proj/repo/fn:2.0',
        runtime: 'java21',
        entryPoint: 'com.example.Handler',
      });

      const c = GoogleFunction.satisfy(fn.component).build();

      expect(c.type.toString()).toBe('APIManagement.FaaS.GoogleFunction');
      expect(c.id.toString()).toBe('bp-fn');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint Fn');
      expect(c.description).toBe('A function');
      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        'europe-west1-docker.pkg.dev/proj/repo/fn:2.0',
      );
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('java21');
      expect(c.parameters.getOptionalFieldByName('entryPoint')).toBe(
        'com.example.Handler',
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const fn = Function.create({
        id: 'bp-fn-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Fn Vendor',
        sourceArtifact: 'europe-west1-docker.pkg.dev/proj/repo/fn:1.0',
        entryPoint: 'com.example.Handler',
      });

      const c = GoogleFunction.satisfy(fn.component)
        .withLocation('europe-west4')
        .withRuntime('python311')
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'europe-west4',
      );
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('python311');
    });
  });
});
