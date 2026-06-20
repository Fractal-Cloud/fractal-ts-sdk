import {describe, expect, it} from 'vitest';
import {AwsLambda} from './aws_lambda';
import {Function} from '../../../../fractal/component/custom_workloads/faas/function';

const BASE_CONFIG = {
  id: 'my-lambda',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Lambda',
  sourceArtifact: '123.dkr.ecr.eu-central-1.amazonaws.com/fn:1.0',
};

describe('AwsLambda', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsLambda.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.FaaS.AwsLambda');
    });

    it('should set provider to AWS', () => {
      const c = AwsLambda.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should serialize the required sourceArtifact param', () => {
      const c = AwsLambda.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        '123.dkr.ecr.eu-central-1.amazonaws.com/fn:1.0',
      );
    });

    it('should serialize vendor + optional params when provided', () => {
      const c = AwsLambda.create({
        ...BASE_CONFIG,
        functionName: 'my-fn',
        roleArn: 'arn:aws:iam::123:role/lambda',
        runtime: 'java21',
        handler: 'com.example.Handler::handle',
        memoryMb: 512,
        timeoutSeconds: 10,
        environment: {KEY: 'value'},
        packageType: 'image',
      });
      expect(c.parameters.getOptionalFieldByName('functionName')).toBe('my-fn');
      expect(c.parameters.getOptionalFieldByName('roleArn')).toBe(
        'arn:aws:iam::123:role/lambda',
      );
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('java21');
      expect(c.parameters.getOptionalFieldByName('handler')).toBe(
        'com.example.Handler::handle',
      );
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBe(512);
      expect(c.parameters.getOptionalFieldByName('timeoutSeconds')).toBe(10);
      expect(c.parameters.getOptionalFieldByName('environment')).toEqual({
        KEY: 'value',
      });
      expect(c.parameters.getOptionalFieldByName('packageType')).toBe('image');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const fn = Function.create({
        id: 'bp-fn',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Fn',
        description: 'A function',
        sourceArtifact: 'reg/fn:1.0',
      });

      const c = AwsLambda.satisfy(fn.component).build();

      expect(c.id.toString()).toBe('bp-fn');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.displayName).toBe('Blueprint Fn');
      expect(c.description).toBe('A function');
    });

    it('should carry the unified function params from the blueprint', () => {
      const fn = Function.create({
        id: 'bp-fn-params',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Fn Params',
        sourceArtifact: 'reg/fn:1.0',
        packageType: 'zip',
        runtime: 'java21',
        handler: 'h::handle',
        memoryMb: 256,
        timeoutSeconds: 5,
        environment: {A: 'b'},
      });

      const c = AwsLambda.satisfy(fn.component).build();

      expect(c.parameters.getOptionalFieldByName('sourceArtifact')).toBe(
        'reg/fn:1.0',
      );
      expect(c.parameters.getOptionalFieldByName('packageType')).toBe('zip');
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('java21');
      expect(c.parameters.getOptionalFieldByName('handler')).toBe('h::handle');
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBe(256);
      expect(c.parameters.getOptionalFieldByName('timeoutSeconds')).toBe(5);
      expect(c.parameters.getOptionalFieldByName('environment')).toEqual({
        A: 'b',
      });
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const fn = Function.create({
        id: 'bp-fn-vendor',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Fn Vendor',
        sourceArtifact: 'reg/fn:1.0',
      });

      const c = AwsLambda.satisfy(fn.component)
        .withFunctionName('vendor-fn')
        .withRoleArn('arn:aws:iam::123:role/lambda')
        .withRuntime('nodejs20.x')
        .withMemoryMb(1024)
        .build();

      expect(c.parameters.getOptionalFieldByName('functionName')).toBe(
        'vendor-fn',
      );
      expect(c.parameters.getOptionalFieldByName('roleArn')).toBe(
        'arn:aws:iam::123:role/lambda',
      );
      expect(c.parameters.getOptionalFieldByName('runtime')).toBe('nodejs20.x');
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBe(1024);
    });

    it('should carry links from the blueprint unchanged', () => {
      const fn = Function.getBuilder()
        .withId('linked-fn')
        .withVersion(1, 0, 0)
        .withDisplayName('Linked Fn')
        .withSourceArtifact('reg/fn:1.0')
        .build();
      const fnWithLink = {
        ...fn,
        links: [...fn.links],
      };

      const c = AwsLambda.satisfy(fnWithLink).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
