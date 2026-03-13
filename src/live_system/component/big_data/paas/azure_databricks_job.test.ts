import {describe, expect, it} from 'vitest';
import {AzureDatabricksJob} from './azure_databricks_job';
import {DataProcessingJob} from '../../../../fractal/component/big_data/paas/data_processing_job';

const BASE_CONFIG = {
  id: 'my-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Job',
};

describe('AzureDatabricksJob', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureDatabricksJob.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    });

    it('should set provider to Azure', () => {
      const c = AzureDatabricksJob.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureDatabricksJob.create({
        ...BASE_CONFIG,
        description: 'A job',
      });
      expect(c.id.toString()).toBe('my-job');
      expect(c.displayName).toBe('My Job');
      expect(c.description).toBe('A job');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Job',
        jobName: 'etl-pipeline',
        taskType: 'notebook_task',
      });

      const c = AzureDatabricksJob.satisfy(bp.component).build();
      expect(c.id.toString()).toBe('bp-job');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Job');
    });

    it('should carry blueprint params (jobName, taskType)', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Job',
        jobName: 'etl-pipeline',
        taskType: 'notebook_task',
        notebookPath: '/Users/me/notebook',
        cronSchedule: '0 0 * * *',
      });

      const c = AzureDatabricksJob.satisfy(bp.component).build();
      expect(c.parameters.getOptionalFieldByName('jobName')).toBe(
        'etl-pipeline',
      );
      expect(c.parameters.getOptionalFieldByName('taskType')).toBe(
        'notebook_task',
      );
      expect(c.parameters.getOptionalFieldByName('notebookPath')).toBe(
        '/Users/me/notebook',
      );
      expect(c.parameters.getOptionalFieldByName('cronSchedule')).toBe(
        '0 0 * * *',
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DataProcessingJob.create({
        id: 'bp-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Job',
      });

      const c = AzureDatabricksJob.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
