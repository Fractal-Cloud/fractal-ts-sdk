import {describe, expect, it} from 'vitest';
import {DataProcessingJob} from './data_processing_job';
import {Datalake} from './datalake';
import {MessagingEntity} from '../../messaging/paas/entity';
import {CaaSMessagingEntity} from '../../messaging/caas/entity';

const BASE_CONFIG = {
  id: 'my-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Job',
  jobName: 'etl-job',
  taskType: 'notebook',
};

const LAKE_VERSION = {major: 1, minor: 0, patch: 0};

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

  describe('linkToDatalake()', () => {
    it('should start with no links', () => {
      const job = DataProcessingJob.create(BASE_CONFIG);
      expect(job.component.links).toHaveLength(0);
    });

    it('should add a raw link with purpose carried in settings', () => {
      const lake = Datalake.create({
        id: 'lake',
        version: LAKE_VERSION,
        displayName: 'Lake',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToDatalake([
        {target: lake, purpose: 'raw'},
      ]);

      expect(job.component.links).toHaveLength(1);
      const link = job.component.links[0];
      expect(link.id.toString()).toBe('lake');
      expect(link.type.toString()).toBe('BigData.PaaS.Datalake');
      expect(link.parameters.getOptionalFieldByName('purpose')).toBe('raw');
      expect(link.parameters.getOptionalFieldByName('path')).toBeNull();
    });

    it('should carry path in settings when provided', () => {
      const lake = Datalake.create({
        id: 'lake',
        version: LAKE_VERSION,
        displayName: 'Lake',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToDatalake([
        {target: lake, purpose: 'curated', path: 'predictions'},
      ]);

      const link = job.component.links[0];
      expect(link.parameters.getOptionalFieldByName('purpose')).toBe('curated');
      expect(link.parameters.getOptionalFieldByName('path')).toBe('predictions');
    });

    it('should accept multiple purposes against the same lake', () => {
      const lake = Datalake.create({
        id: 'lake',
        version: LAKE_VERSION,
        displayName: 'Lake',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToDatalake([
        {target: lake, purpose: 'raw', path: 'observations'},
        {target: lake, purpose: 'curated', path: 'predictions'},
        {target: lake, purpose: 'checkpoint', path: 'crisiswatch'},
      ]);

      expect(job.component.links).toHaveLength(3);
      const purposes = job.component.links.map(l =>
        l.parameters.getOptionalFieldByName('purpose'),
      );
      expect(purposes).toEqual(['raw', 'curated', 'checkpoint']);
    });

    it('should accept links to different lakes', () => {
      const bronzeLake = Datalake.create({
        id: 'bronze-lake',
        version: LAKE_VERSION,
        displayName: 'Bronze',
      });
      const goldLake = Datalake.create({
        id: 'gold-lake',
        version: LAKE_VERSION,
        displayName: 'Gold',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToDatalake([
        {target: bronzeLake, purpose: 'raw'},
        {target: goldLake, purpose: 'curated'},
      ]);

      expect(job.component.links).toHaveLength(2);
      expect(job.component.links[0].id.toString()).toBe('bronze-lake');
      expect(job.component.links[1].id.toString()).toBe('gold-lake');
    });

    it('should be immutable — linkToDatalake returns a new node', () => {
      const lake = Datalake.create({
        id: 'lake',
        version: LAKE_VERSION,
        displayName: 'Lake',
      });
      const original = DataProcessingJob.create(BASE_CONFIG);
      const linked = original.linkToDatalake([{target: lake, purpose: 'raw'}]);

      expect(original.component.links).toHaveLength(0);
      expect(linked.component.links).toHaveLength(1);
    });
  });

  describe('linkToMessagingEntity()', () => {
    const ENTITY_VERSION = {major: 1, minor: 0, patch: 0};

    it('should add a publish link to a PaaS entity with the entity type carried through', () => {
      const topic = MessagingEntity.create({
        id: 'predictions',
        version: ENTITY_VERSION,
        displayName: 'Predictions',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToMessagingEntity([
        {target: topic, access: 'publish'},
      ]);

      expect(job.component.links).toHaveLength(1);
      const link = job.component.links[0];
      expect(link.id.toString()).toBe('predictions');
      expect(link.type.toString()).toBe('Messaging.PaaS.Entity');
      expect(link.parameters.getOptionalFieldByName('access')).toBe('publish');
    });

    it('should support a CaaS entity target and carry its type through', () => {
      const topic = CaaSMessagingEntity.create({
        id: 'observations-raw',
        version: ENTITY_VERSION,
        displayName: 'Observations',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToMessagingEntity([
        {
          target: topic,
          access: 'subscribe',
          consumerGroup: 'crisiswatch-spark',
        },
      ]);

      const link = job.component.links[0];
      expect(link.type.toString()).toBe('Messaging.CaaS.Entity');
      expect(link.parameters.getOptionalFieldByName('access')).toBe(
        'subscribe',
      );
      expect(link.parameters.getOptionalFieldByName('consumerGroup')).toBe(
        'crisiswatch-spark',
      );
    });

    it('should accept publish-subscribe access and a startingPosition setting', () => {
      const topic = MessagingEntity.create({
        id: 'events',
        version: ENTITY_VERSION,
        displayName: 'Events',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToMessagingEntity([
        {
          target: topic,
          access: 'publish-subscribe',
          consumerGroup: 'audit',
          startingPosition: 'end',
        },
      ]);

      const link = job.component.links[0];
      expect(link.parameters.getOptionalFieldByName('access')).toBe(
        'publish-subscribe',
      );
      expect(link.parameters.getOptionalFieldByName('startingPosition')).toBe(
        'end',
      );
    });

    it('should accept multiple links across topics', () => {
      const observations = MessagingEntity.create({
        id: 'observations-raw',
        version: ENTITY_VERSION,
        displayName: 'Observations',
      });
      const predictions = MessagingEntity.create({
        id: 'predictions',
        version: ENTITY_VERSION,
        displayName: 'Predictions',
      });
      const mlflowRuns = MessagingEntity.create({
        id: 'mlflow-runs',
        version: ENTITY_VERSION,
        displayName: 'MLflow Runs',
      });
      const job = DataProcessingJob.create(BASE_CONFIG).linkToMessagingEntity([
        {target: observations, access: 'subscribe'},
        {target: predictions, access: 'publish'},
        {target: mlflowRuns, access: 'publish'},
      ]);

      expect(job.component.links).toHaveLength(3);
      expect(job.component.links.map(l => l.id.toString())).toEqual([
        'observations-raw',
        'predictions',
        'mlflow-runs',
      ]);
    });

    it('should be immutable — linkToMessagingEntity returns a new node', () => {
      const topic = MessagingEntity.create({
        id: 'predictions',
        version: ENTITY_VERSION,
        displayName: 'Predictions',
      });
      const original = DataProcessingJob.create(BASE_CONFIG);
      const linked = original.linkToMessagingEntity([
        {target: topic, access: 'publish'},
      ]);

      expect(original.component.links).toHaveLength(0);
      expect(linked.component.links).toHaveLength(1);
    });

    it('should compose with linkToDatalake — both link types carried on the same node', () => {
      const topic = MessagingEntity.create({
        id: 'predictions',
        version: ENTITY_VERSION,
        displayName: 'Predictions',
      });
      const lake = Datalake.create({
        id: 'lake',
        version: LAKE_VERSION,
        displayName: 'Lake',
      });
      const job = DataProcessingJob.create(BASE_CONFIG)
        .linkToDatalake([{target: lake, purpose: 'raw'}])
        .linkToMessagingEntity([{target: topic, access: 'publish'}]);

      expect(job.component.links).toHaveLength(2);
      const types = job.component.links.map(l => l.type.toString());
      expect(types).toContain('BigData.PaaS.Datalake');
      expect(types).toContain('Messaging.PaaS.Entity');
    });
  });
});
