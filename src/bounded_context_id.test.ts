import {beforeEach, describe, expect, it} from 'vitest';
import {BoundedContextId, getBoundedContextIdBuilder} from "./bounded_context_id";
import {getKebabCaseStringBuilder} from "./values/kebab_case_string";
import {OwnerType} from "./values/owner_type";
import {getOwnerIdBuilder} from "./values/owner_id";

describe('Bounded Context Id Builder', () => {
  const sut = getBoundedContextIdBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Bounded Context Id when set correctly', () => {
    const expectedOwnerId = '550e8400-e29b-41d4-a716-446655440000';
    const expectedName = 'correct-bounded-context-name';
    expect(sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(getOwnerIdBuilder()
        .withValue(expectedOwnerId)
        .build())
      .withName(
        getKebabCaseStringBuilder()
          .withValue(expectedName)
          .build())
      .build())
    .toSatisfy( ({ownerType, ownerId, name}: BoundedContextId) =>
      ownerType === OwnerType.Personal &&
      ownerId.value === expectedOwnerId &&
      name.value === expectedName);
  });

  it('should throw a SyntaxError if Bounded Context Id ownerId is not initialized', () => {
    const expectedName = 'correct-bounded-context-name';
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withName(
        getKebabCaseStringBuilder()
          .withValue(expectedName)
          .build())
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Bounded Context Id name is not initialized', () => {
    const expectedOwnerId = '550e8400-e29b-41d4-a716-446655440000';
    expect(() => sut
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(getOwnerIdBuilder()
        .withValue(expectedOwnerId)
        .build())
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Bounded Context Id is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })

});
