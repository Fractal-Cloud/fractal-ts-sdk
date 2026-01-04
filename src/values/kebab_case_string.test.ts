import { describe, expect, it, beforeEach } from 'vitest';
import {getKebabCaseStringBuilder, KebabCaseString} from './kebab_case_string';

describe('Kebab Case String Builder', () => {
  const sut = getKebabCaseStringBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Kebab String when set correctly', () => {
    const expected = 'correct-kebab-cased-string';
    expect(sut.withValue(expected).build())
    .toSatisfy( ({value}: KebabCaseString) => value === expected);
  });

  it('should throw a RangeError if Kebab String is empty', () => {
    expect(() => sut.withValue('').build()).toThrow(RangeError);
  })

  it('should throw a RangeError if Kebab String is set incorrectly', () => {
    expect(() => sut.withValue('0no-whatever').build()).toThrow(RangeError);
  })

  it('should throw a SyntaxError if Kebab String is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
