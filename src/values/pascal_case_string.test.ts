import { describe, expect, it, beforeEach } from 'vitest';
import {getPascalCaseStringBuilder, PascalCaseString} from './pascal_case_string';

describe('Pascal Case String Builder', () => {
  const sut = getPascalCaseStringBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Pascal String when set correctly', () => {
    const expected = 'CorrectPascalCasedString';
    expect(sut.withValue(expected).build())
    .toSatisfy( ({pascalValue}: PascalCaseString) => pascalValue === expected);
  });

  it('should throw a SyntaxError if Pascal String is empty', () => {
    expect(() => sut.withValue('').build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Pascal String is set incorrectly', () => {
    expect(() => sut.withValue('whatever').build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Pascal String is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
