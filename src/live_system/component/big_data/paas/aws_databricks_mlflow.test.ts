import {describe, expect, it} from 'vitest';
import {AwsDatabricksMlflow} from './aws_databricks_mlflow';
import {MlExperiment} from '../../../../fractal/component/big_data/paas/ml_experiment';

const BASE_CONFIG = {
  id: 'my-experiment',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My MLflow Experiment',
};

describe('AwsDatabricksMlflow', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsDatabricksMlflow.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'BigData.PaaS.DatabricksMlflowExperiment'
      );
    });

    it('should set provider to AWS', () => {
      const c = AwsDatabricksMlflow.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set experiment parameters', () => {
      const c = AwsDatabricksMlflow.create({
        ...BASE_CONFIG,
        experimentName: 'fraud-detection',
        artifactLocation: 's3://my-bucket/mlflow',
      });
      expect(c.parameters.getOptionalFieldByName('experimentName')).toBe(
        'fraud-detection'
      );
      expect(c.parameters.getOptionalFieldByName('artifactLocation')).toBe(
        's3://my-bucket/mlflow'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Experiment',
      });

      const c = AwsDatabricksMlflow.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-experiment');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Experiment');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Experiment',
      });

      const c = AwsDatabricksMlflow.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should carry blueprint params', () => {
      const bp = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Experiment',
        experimentName: 'fraud-detection',
      });
      const c = AwsDatabricksMlflow.satisfy(bp.component)
        .withArtifactLocation('s3://my-bucket/mlflow')
        .build();
      expect(c.parameters.getOptionalFieldByName('experimentName')).toBe(
        'fraud-detection'
      );
      expect(c.parameters.getOptionalFieldByName('artifactLocation')).toBe(
        's3://my-bucket/mlflow'
      );
    });
  });
});
