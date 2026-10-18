/**
 * vm_sizes.test.ts — `withSize` reads a neutral size only from the size table
 * itself: a name every object inherits (`constructor`, `__proto__`,
 * `toString`) is neither a neutral size nor a machine type.
 */
import {describe, expect, it} from 'vitest';
import {
  awsInstanceType,
  azureVmSize,
  gcpMachineType,
  ociShape,
} from './vm_sizes';

describe('neutral VM sizes', () => {
  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'refuses %s, which only the prototype holds',
    name => {
      for (const translate of [
        awsInstanceType,
        azureVmSize,
        gcpMachineType,
        ociShape,
      ]) {
        expect(() => translate(name)).toThrow(/is neither a neutral size/);
      }
    },
  );

  it('still reads a neutral size and a vendor machine type', () => {
    expect(awsInstanceType('small')).toBe('t3.small');
    expect(awsInstanceType('c7g.large')).toBe('c7g.large');
  });
});
