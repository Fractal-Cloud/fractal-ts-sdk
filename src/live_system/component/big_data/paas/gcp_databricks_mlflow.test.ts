import {describe, expect, it} from 'vitest';
import {GcpDatabricksMlflow} from './gcp_databricks_mlflow';
import {MlExperiment} from '../../../../fractal/component/big_data/paas/ml_experiment';

const BASE_CONFIG = {
  id: 'my-experiment',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Experiment',
};

describe('GcpDatabricksMlflow', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpDatabricksMlflow.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'BigData.PaaS.DatabricksMlflowExperiment'
      );
    });

    it('should set provider to GCP', () => {
      const c = GcpDatabricksMlflow.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Experiment',
      });

      const c = GcpDatabricksMlflow.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-experiment');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Experiment');
    });

    it('should carry experimentName from blueprint', () => {
      const {component: blueprint} = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Experiment',
        experimentName: 'fraud-detection',
      });

      const c = GcpDatabricksMlflow.satisfy(blueprint).build();
      expect(c.parameters.getOptionalFieldByName('experimentName')).toBe(
        'fraud-detection'
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const {component: blueprint} = MlExperiment.create({
        id: 'bp-experiment',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Experiment',
      });

      const c = GcpDatabricksMlflow.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
