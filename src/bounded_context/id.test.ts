import {beforeEach, describe, expect, it} from 'vitest';
import {BoundedContext} from "./";
import {OwnerType} from "../values/owner_type";
import {aKebabCaseString, aOwnerId} from "../test_utils.test";

describe('Bounded Context Id Builder', () => {
  const sut = BoundedContext.Id.getBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Bounded Context Id when set correctly', () => {
    const expectedOwnerId = aOwnerId();
    const expectedName = aKebabCaseString();
    expect(sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(expectedOwnerId)
      .withName(expectedName)
      .build())
    .toSatisfy( ({ownerType, ownerId, name}: BoundedContext.Id) =>
      ownerType === OwnerType.Personal &&
      ownerId.value === expectedOwnerId.value &&
      name.value === expectedName.value);
  });

  it('should throw a SyntaxError if Bounded Context Id ownerId is not initialized', () => {
    const expectedName = aKebabCaseString();
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withName(expectedName)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Bounded Context Id name is not initialized', () => {
    const expectedOwnerId = aOwnerId();
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(expectedOwnerId)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Bounded Context Id is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
