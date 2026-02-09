import { describe, expect, it, beforeEach } from 'vitest';
import { getVersionBuilder } from './version';

describe('Version Builder', () => {
  const sut = getVersionBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid version when only patch set', () => {
    expect(sut.withPatch(1).build())
    .toSatisfy(val => val.equals({
      major: 0,
      minor: 0,
      patch: 1
    }));
  });

  it('should return a valid version when only minor set', () => {
    expect(sut.withMinor(1).build())
    .toSatisfy(val => val.equals({
      major: 0,
      minor: 1,
      patch: 0
    }));
  });

  it('should return a valid version when only major set', () => {
    expect(sut.withMajor(1).build())
    .toSatisfy(val => val.equals({
      major: 1,
      minor: 0,
      patch: 0
    }));
  });
  
  it('should throw a SyntaxError if Version is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
