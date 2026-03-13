import {describe, expect, it} from 'vitest';
import {DataProcessingJob} from './data_processing_job';

const BASE_CONFIG = {
  id: 'my-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Job',
  jobName: 'etl-job',
  taskType: 'notebook',
};

describe('DataProcessingJob (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = DataProcessingJob.create(BASE_CONFIG);
      expect(component.type.toString()).toBe(
        'BigData.PaaS.DataProcessingJob',
      );
    });

    it('should set id, version, and displayName', () => {
      const {component} = DataProcessingJob.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-job');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Job');
    });

    it('should set description when provided', () => {
      const {component} = DataProcessingJob.create({
        ...BASE_CONFIG,
        description: 'ETL pipeline',
      });
      expect(component.description).toBe('ETL pipeline');
    });

    it('should not set description when omitted', () => {
      const {component} = DataProcessingJob.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should set required parameters', () => {
      const {component} = DataProcessingJob.create(BASE_CONFIG);
      expect(component.parameters.getOptionalFieldByName('jobName')).toBe(
        'etl-job',
      );
      expect(component.parameters.getOptionalFieldByName('taskType')).toBe(
        'notebook',
      );
    });

    it('should set optional parameters when provided', () => {
      const {component} = DataProcessingJob.create({
        ...BASE_CONFIG,
        notebookPath: '/Users/me/notebook',
        cronSchedule: '0 0 * * *',
        maxRetries: 3,
        existingCluster: true,
      });
      expect(
        component.parameters.getOptionalFieldByName('notebookPath'),
      ).toBe('/Users/me/notebook');
      expect(
        component.parameters.getOptionalFieldByName('cronSchedule'),
      ).toBe('0 0 * * *');
      expect(component.parameters.getOptionalFieldByName('maxRetries')).toBe(
        3,
      );
      expect(
        component.parameters.getOptionalFieldByName('existingCluster'),
      ).toBe(true);
    });

    it('should set pythonFile, mainClassName, jarUri, and parameters', () => {
      const {component} = DataProcessingJob.create({
        ...BASE_CONFIG,
        pythonFile: 'dbfs:/scripts/main.py',
        mainClassName: 'com.example.Main',
        jarUri: 'dbfs:/jars/app.jar',
        parameters: ['--input', '/data'],
      });
      expect(
        component.parameters.getOptionalFieldByName('pythonFile'),
      ).toBe('dbfs:/scripts/main.py');
      expect(
        component.parameters.getOptionalFieldByName('mainClassName'),
      ).toBe('com.example.Main');
      expect(component.parameters.getOptionalFieldByName('jarUri')).toBe(
        'dbfs:/jars/app.jar',
      );
      expect(
        component.parameters.getOptionalFieldByName('parameters'),
      ).toEqual(['--input', '/data']);
    });

    it('should not set optional parameters when omitted', () => {
      const {component} = DataProcessingJob.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('notebookPath'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('cronSchedule'),
      ).toBeNull();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = DataProcessingJob.getBuilder()
        .withId('job-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Job A')
        .withJobName('job-a-name')
        .withTaskType('python')
        .build();

      expect(c.type.toString()).toBe('BigData.PaaS.DataProcessingJob');
      expect(c.id.toString()).toBe('job-a');
    });
  });
});
