import {describe, expect, it} from 'vitest';
import {AzureDatabricksMlflow} from './azure_databricks_mlflow';
import {MlExperiment} from '../../../../fractal/component/big_data/paas/ml_experiment';

const BASE_CONFIG = {
  id: 'my-experiment',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Experiment',
};

describe('AzureDatabricksMlflow', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureDatabricksMlflow.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'BigData.PaaS.DatabricksMlflowExperiment',
      );
    });

    it('should set provider to Azure', () => {
      const c = AzureDatabricksMlflow.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureDatabricksMlflow.create({
        ...BASE_CONFIG,
        description: 'An experiment',
      });
      expect(c.id.toString()).toBe('my-experiment');
      expect(c.displayName).toBe('My Experiment');
      expect(c.description).toBe('An experiment');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = MlExperiment.create({
        id: 'bp-exp',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Experiment',
        experimentName: 'my-exp',
      });

      const c = AzureDatabricksMlflow.satisfy(bp.component).build();
      expect(c.id.toString()).toBe('bp-exp');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Experiment');
    });

    it('should carry blueprint params (experimentName) and set artifactLocation via sealed builder', () => {
      const bp = MlExperiment.create({
        id: 'bp-exp',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Experiment',
        experimentName: 'training-exp',
      });

      const c = AzureDatabricksMlflow.satisfy(bp.component)
        .withArtifactLocation('dbfs:/artifacts')
        .build();
      expect(c.parameters.getOptionalFieldByName('experimentName')).toBe(
        'training-exp',
      );
      expect(c.parameters.getOptionalFieldByName('artifactLocation')).toBe(
        'dbfs:/artifacts',
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = MlExperiment.create({
        id: 'bp-exp',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Experiment',
      });

      const c = AzureDatabricksMlflow.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
