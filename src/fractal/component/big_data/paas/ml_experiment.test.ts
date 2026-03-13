import {describe, expect, it} from 'vitest';
import {MlExperiment} from './ml_experiment';

const BASE_CONFIG = {
  id: 'my-experiment',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Experiment',
};

describe('MlExperiment (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = MlExperiment.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('BigData.PaaS.MlExperiment');
    });

    it('should set id, version, and displayName', () => {
      const {component} = MlExperiment.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-experiment');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Experiment');
    });

    it('should set description when provided', () => {
      const {component} = MlExperiment.create({
        ...BASE_CONFIG,
        description: 'ML training experiment',
      });
      expect(component.description).toBe('ML training experiment');
    });

    it('should not set description when omitted', () => {
      const {component} = MlExperiment.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should set experimentName parameter', () => {
      const {component} = MlExperiment.create({
        ...BASE_CONFIG,
        experimentName: 'fraud-detection',
      });
      expect(
        component.parameters.getOptionalFieldByName('experimentName'),
      ).toBe('fraud-detection');
    });

    it('should not set parameters when omitted', () => {
      const {component} = MlExperiment.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('experimentName'),
      ).toBeNull();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = MlExperiment.getBuilder()
        .withId('exp-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Experiment A')
        .build();

      expect(c.type.toString()).toBe('BigData.PaaS.MlExperiment');
      expect(c.id.toString()).toBe('exp-a');
    });

    it('should support fluent experimentName', () => {
      const c = MlExperiment.getBuilder()
        .withId('exp-b')
        .withVersion(1, 0, 0)
        .withDisplayName('Experiment B')
        .withExperimentName('churn-prediction')
        .build();

      expect(
        c.parameters.getOptionalFieldByName('experimentName'),
      ).toBe('churn-prediction');
    });
  });
});
