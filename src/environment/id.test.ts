import {beforeEach, describe, expect, it} from 'vitest';
import {OwnerType} from "../values/owner_type";
import {aKebabCaseString, aOwnerId} from "../test_utils.test";
import {Environment} from "./index";

describe('Environment Id Builder', () => {
  const sut = Environment.Id.getBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Environment Id when set correctly', () => {
    const expectedOwnerId = aOwnerId();
    const expectedName = aKebabCaseString();
    expect(sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(expectedOwnerId)
      .withName(expectedName)
      .build())
    .toSatisfy( ({ownerType, ownerId, name}: Environment.Id) =>
      ownerType === OwnerType.Personal &&
      ownerId.value === expectedOwnerId.value &&
      name.value === expectedName.value);
  });

  it('should throw a SyntaxError if Environment Id ownerId is not initialized', () => {
    const expectedName = aKebabCaseString();
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withName(expectedName)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Environment Id name is not initialized', () => {
    const expectedOwnerId = aOwnerId();
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(expectedOwnerId)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Environment Id is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
