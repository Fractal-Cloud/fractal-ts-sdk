import {describe, expect, it} from 'vitest';
import {GcpDatabricksJob} from './gcp_databricks_job';
import {DataProcessingJob} from '../../../../fractal/component/big_data/paas/data_processing_job';

const BASE_CONFIG = {
  id: 'my-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Job',
};

describe('GcpDatabricksJob', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpDatabricksJob.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    });

    it('should set provider to GCP', () => {
      const c = GcpDatabricksJob.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Job',
      });

      const c = GcpDatabricksJob.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-job');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Job');
    });

    it('should carry jobName and taskType from blueprint', () => {
      const {component: blueprint} = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Job',
        jobName: 'etl-pipeline',
        taskType: 'notebook_task',
      });

      const c = GcpDatabricksJob.satisfy(blueprint).build();
      expect(c.parameters.getOptionalFieldByName('jobName')).toBe(
        'etl-pipeline'
      );
      expect(c.parameters.getOptionalFieldByName('taskType')).toBe(
        'notebook_task'
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const {component: blueprint} = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Job',
      });

      const c = GcpDatabricksJob.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
