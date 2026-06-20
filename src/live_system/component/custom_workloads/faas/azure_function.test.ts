import {describe, expect, it} from 'vitest';
import {AzureFunction} from './azure_function';
import {Function} from '../../../../fractal/component/custom_workloads/faas/function';

const BASE_CONFIG = {
  id: 'my-func',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Function',
  sourceArtifact: 'myacr.azurecr.io/team/fn:1.0',
};

describe('AzureFunction', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureFunction.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('CustomWorkloads.FaaS.AzureFunction');
    });

    it('should set provider to Azure', () => {
      const c = AzureFunction.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should serialize the required sourceArtifact param', () => {
      const c = AzureFunction.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        'myacr.azurecr.io/team/fn:1.0',
      );
    });

    it('should serialize vendor + optional params when provided', () => {
      const c = AzureFunction.create({
        ...BASE_CONFIG,
        packageType: 'image',
        environment: {KEY: 'value'},
        storageAccountConnectionString:
          'DefaultEndpointsProtocol=https;AccountName=test',
        appSettings: {SETTING: 'on'},
        applicationStack: {javaVersion: '17'},
        identity: {type: 'SystemAssigned'},
        appServicePlan: {name: 'sp-app', sku: 'B1'},
      });
      expect(c.parameters.getOptionalFieldByName('packageType')).toBe('image');
      expect(c.parameters.getOptionalFieldByName('environment')).toEqual({
        KEY: 'value',
      });
      expect(
        c.parameters.getOptionalFieldByName('storageAccountConnectionString'),
      ).toBe('DefaultEndpointsProtocol=https;AccountName=test');
      expect(c.parameters.getOptionalFieldByName('appSettings')).toEqual({
        SETTING: 'on',
      });
      expect(c.parameters.getOptionalFieldByName('configuration')).toEqual({
        applicationStack: {javaVersion: '17'},
      });
      expect(c.parameters.getOptionalFieldByName('identity')).toEqual({
        type: 'SystemAssigned',
      });
      expect(c.parameters.getOptionalFieldByName('appServicePlan')).toEqual({
        name: 'sp-app',
        sku: 'B1',
      });
    });

    it('should prefer a full configuration block over a bare applicationStack', () => {
      const c = AzureFunction.create({
        ...BASE_CONFIG,
        applicationStack: {nodeVersion: '20'},
        configuration: {
          alwaysOn: true,
          applicationStack: {pythonVersion: '3.11'},
        },
      });
      expect(c.parameters.getOptionalFieldByName('configuration')).toEqual({
        alwaysOn: true,
        applicationStack: {pythonVersion: '3.11'},
      });
    });
  });

  describe('satisfy()', () => {
    it('should copy structural fields and carry the unified params from the blueprint', () => {
      const fn = Function.create({
        id: 'bp-fn',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Fn',
        description: 'A function',
        sourceArtifact: 'myacr.azurecr.io/team/fn:2.0',
        packageType: 'zip',
        environment: {A: 'b'},
      });

      const c = AzureFunction.satisfy(fn.component).build();

      expect(c.type.toString()).toBe('CustomWorkloads.FaaS.AzureFunction');
      expect(c.id.toString()).toBe('bp-fn');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint Fn');
      expect(c.description).toBe('A function');
      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        'myacr.azurecr.io/team/fn:2.0',
      );
      expect(c.parameters.getOptionalFieldByName('packageType')).toBe('zip');
      expect(c.parameters.getOptionalFieldByName('environment')).toEqual({
        A: 'b',
      });
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const fn = Function.create({
        id: 'bp-fn-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Fn Vendor',
        sourceArtifact: 'myacr.azurecr.io/team/fn:1.0',
      });

      const c = AzureFunction.satisfy(fn.component)
        .withStorageAccountConnectionString('DefaultEndpointsProtocol=https')
        .withApplicationStack({javaVersion: '17'})
        .build();

      expect(
        c.parameters.getOptionalFieldByName('storageAccountConnectionString'),
      ).toBe('DefaultEndpointsProtocol=https');
      expect(c.parameters.getOptionalFieldByName('configuration')).toEqual({
        applicationStack: {javaVersion: '17'},
      });
    });
  });
});
