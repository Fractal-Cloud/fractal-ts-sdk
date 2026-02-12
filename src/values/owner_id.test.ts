import { describe, expect, it, beforeEach } from 'vitest';
import {OwnerId} from './owner_id';
import {aUuid} from "../test_utils.test";

describe('Owner Id Builder', () => {
  const sut = OwnerId.getBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Owner Id when set correctly', () => {
    const expected = aUuid();
    expect(sut.withValue(expected).build())
    .toSatisfy( ({value}: OwnerId) => value === expected);
  });

  it('should throw a SyntaxError if Owner Id is empty', () => {
    expect(() => sut.withValue('').build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Owner Id is set incorrectly', () => {
    expect(() => sut.withValue('whatever').build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Owner Id is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
