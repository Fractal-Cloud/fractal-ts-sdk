import {describe, expect, it} from 'vitest';
import {AwsDatabricksJob} from './aws_databricks_job';
import {DataProcessingJob} from '../../../../fractal/component/big_data/paas/data_processing_job';

const BASE_CONFIG = {
  id: 'my-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Job',
};

describe('AwsDatabricksJob', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsDatabricksJob.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    });

    it('should set provider to AWS', () => {
      const c = AwsDatabricksJob.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set job parameters', () => {
      const c = AwsDatabricksJob.create({
        ...BASE_CONFIG,
        jobName: 'etl-pipeline',
        taskType: 'notebook',
        notebookPath: '/Shared/etl',
        cronSchedule: '0 0 * * *',
        maxRetries: 3,
      });
      expect(c.parameters.getOptionalFieldByName('jobName')).toBe(
        'etl-pipeline'
      );
      expect(c.parameters.getOptionalFieldByName('taskType')).toBe(
        'notebook'
      );
      expect(c.parameters.getOptionalFieldByName('notebookPath')).toBe(
        '/Shared/etl'
      );
      expect(c.parameters.getOptionalFieldByName('cronSchedule')).toBe(
        '0 0 * * *'
      );
      expect(c.parameters.getOptionalFieldByName('maxRetries')).toBe(3);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Job',
      });

      const c = AwsDatabricksJob.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-job');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Job');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Job',
      });

      const c = AwsDatabricksJob.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should carry blueprint params', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Job',
        jobName: 'etl-pipeline',
        notebookPath: '/Shared/etl',
        cronSchedule: '0 0 * * *',
      });
      const c = AwsDatabricksJob.satisfy(bp.component).build();
      expect(c.parameters.getOptionalFieldByName('jobName')).toBe(
        'etl-pipeline'
      );
      expect(c.parameters.getOptionalFieldByName('notebookPath')).toBe(
        '/Shared/etl'
      );
      expect(c.parameters.getOptionalFieldByName('cronSchedule')).toBe(
        '0 0 * * *'
      );
    });
  });
});
