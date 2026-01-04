import { describe, expect, it, beforeEach } from 'vitest';
import {getOwnerIdBuilder, OwnerId} from './owner_id';

describe('Owner Id Builder', () => {
  const sut = getOwnerIdBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Owner Id when set correctly', () => {
    const expected = '550e8400-e29b-41d4-a716-446655440000';
    expect(sut.withValue(expected).build())
    .toSatisfy( ({value}: OwnerId) => value === expected);
  });

  it('should throw a RangeError if Owner Id is set incorrectly', () => {
    expect(() => sut.withValue('whatever').build()).toThrow(RangeError);
  })

  it('should throw a SyntaxError if Owner Id is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
