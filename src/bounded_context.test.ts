import {beforeEach, describe, expect, it} from 'vitest';
import {BoundedContext, getBoundedContextBuilder} from "./bounded_context";
import {aBoundedContextId} from "./test_utils.test";

describe('Bounded Context Builder', () => {
  const sut = getBoundedContextBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Bounded Context when set correctly', () => {
    const expectedId = aBoundedContextId();
    const expectedDisplayName = 'A Bounded Context';
    const expectedDescription = 'A description of a bounded context';
    expect(sut
      .withId(expectedId)
      .withDisplayName(expectedDisplayName)
      .withDescription(expectedDescription)
      .build())
    .toSatisfy( ({id, displayName, description}: BoundedContext) =>
      id.equals(expectedId) &&
      displayName === expectedDisplayName &&
      description === expectedDescription);
  });

  it('should return a valid Bounded Context when description not set', () => {
    const expectedId = aBoundedContextId();
    const expectedDisplayName = 'A Bounded Context';
    expect(sut
      .withId(expectedId)
      .withDisplayName(expectedDisplayName)
      .build())
      .toSatisfy( ({id, displayName}: BoundedContext) =>
        id.equals(expectedId) &&
        displayName === expectedDisplayName);
  });

  it('should throw a SyntaxError if Bounded Context id is not initialized', () => {
    const expectedDisplayName = 'A Bounded Context';
    const expectedDescription = 'A description of a bounded context';
    expect(() => sut
      .withDisplayName(expectedDisplayName)
      .withDescription(expectedDescription)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Bounded Context is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })
});
