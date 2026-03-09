import {describe, expect, it} from 'vitest';
import {AwsEcsTaskDefinition} from './ecs_task_definition';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';
import {
  CONTAINER_IMAGE_PARAM,
  CONTAINER_PORT_PARAM,
  CPU_PARAM,
  MEMORY_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-task',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Task',
  containerImage: 'nginx:latest',
  containerPort: 80,
  cpu: '256',
  memory: '512',
};

describe('AwsEcsTaskDefinition', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsEcsTaskDefinition.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.ECSTaskDefinition',
      );
    });

    it('should set provider to AWS', () => {
      const c = AwsEcsTaskDefinition.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set container image and port', () => {
      const c = AwsEcsTaskDefinition.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CONTAINER_IMAGE_PARAM)).toBe(
        'nginx:latest',
      );
      expect(c.parameters.getOptionalFieldByName(CONTAINER_PORT_PARAM)).toBe(
        80,
      );
    });

    it('should set IAM role ARNs when provided', () => {
      const c = AwsEcsTaskDefinition.create({
        ...BASE_CONFIG,
        executionRoleArn: 'arn:aws:iam::123:role/exec',
        taskRoleArn: 'arn:aws:iam::123:role/task',
      });
      expect(
        c.parameters.getOptionalFieldByName('executionRoleArn'),
      ).toBe('arn:aws:iam::123:role/exec');
      expect(c.parameters.getOptionalFieldByName('taskRoleArn')).toBe(
        'arn:aws:iam::123:role/task',
      );
    });
  });

  describe('satisfy()', () => {
    it('should derive task ID as workload-id + "-task"', () => {
      const workload = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web Workload',
        containerImage: 'nginx:latest',
      });
      const c = AwsEcsTaskDefinition.satisfy(workload.component).build();
      expect(c.id.toString()).toBe('web-workload-task');
    });

    it('should carry containerImage, cpu, and memory from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Workload',
        containerImage: 'myapp:v2',
        cpu: '512',
        memory: '1024',
      });

      const c = AwsEcsTaskDefinition.satisfy(workload.component).build();
      expect(c.parameters.getOptionalFieldByName(CONTAINER_IMAGE_PARAM)).toBe(
        'myapp:v2',
      );
      expect(c.parameters.getOptionalFieldByName(CPU_PARAM)).toBe('512');
      expect(c.parameters.getOptionalFieldByName(MEMORY_PARAM)).toBe('1024');
    });

    it('should allow adding IAM role ARNs after satisfy', () => {
      const workload = Workload.create({
        id: 'bp-workload-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Workload B',
        containerImage: 'nginx:alpine',
      });

      const c = AwsEcsTaskDefinition.satisfy(workload.component)
        .withExecutionRoleArn('arn:aws:iam::123:role/exec')
        .withTaskRoleArn('arn:aws:iam::123:role/task')
        .build();

      expect(
        c.parameters.getOptionalFieldByName('executionRoleArn'),
      ).toBe('arn:aws:iam::123:role/exec');
    });

    it('should have no dependencies (task def is standalone)', () => {
      const workload = Workload.create({
        id: 'bp-workload-c',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Workload C',
        containerImage: 'app:latest',
      });
      const c = AwsEcsTaskDefinition.satisfy(workload.component).build();
      expect(c.dependencies).toHaveLength(0);
    });
  });
});
