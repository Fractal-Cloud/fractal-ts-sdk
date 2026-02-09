import {beforeEach, describe, expect, it} from 'vitest';
import {Component} from "./";
import {
  aComponentId,
  aComponentType,
  aVersion,
  aParameters,
  manyComponentLinks,
  manyComponentDependencies,
} from "../test_utils.test";

const areParametersEquivalent = (actual: Component.Parameters, expected: Component.Parameters): boolean => {
  const actualFieldNames = actual.getAllFieldNames();
  const expectedFieldNames = expected.getAllFieldNames();
  return actualFieldNames.length == expectedFieldNames.length
    && actualFieldNames.every(name => actual.getRequiredFieldByName(name) === expected.getRequiredFieldByName(name));
}

const areLinksEquivalent = (actual: Component.Link[], expected: Component.Link[]): boolean => {
  var actualLinksByComponentId = actual.reduce((acc, curr) => {
    acc[curr.id.value.value] = curr;
    return acc;
  }, {} as Record<string, Component.Link>);
  return actual.length === expected.length
    && expected.every(link => actualLinksByComponentId[link.id.value.value].equals(link));
}

const areDependenciesEquivalent = (actual: Component.Dependency[], expected: Component.Dependency[]): boolean => {
  var actualDependencyByComponentType = actual.reduce((acc, curr) => {
    acc[curr.type.toString()] = curr;
    return acc;
  }, {} as Record<string, Component.Dependency>);
  return actual.length === expected.length
    && expected.every(dep => actualDependencyByComponentType[dep.type.toString()]);
}

describe('Component Builder', () => {
  const sut = Component.getBuilder();

  beforeEach(() => sut.reset());

  it('should return a valid Component when set correctly', () => {
    const expectedType = aComponentType();
    const expectedId = aComponentId();
    const expectedVersion = aVersion();
    const expectedDisplayName = 'A Component';
    const expectedDescription = 'A description of a component';
    const expectedParameters = aParameters();
    const expectedLinks = manyComponentLinks();
    const expectedDependencies = manyComponentDependencies();

    expect(sut
      .withType(expectedType)
      .withId(expectedId)
      .withVersion(expectedVersion)
      .withDisplayName(expectedDisplayName)
      .withDescription(expectedDescription)
      .withParameters(expectedParameters)
      .withLinks(expectedLinks)
      .withDependencies(expectedDependencies)
      .build())
    .toSatisfy( ({type, id, version, displayName, description, parameters, links, dependencies}: Component) =>
      type.equals(expectedType) &&
      id.equals(expectedId) &&
      version.equals(expectedVersion) &&
      displayName === expectedDisplayName &&
      description === expectedDescription &&
      areParametersEquivalent(parameters, expectedParameters) &&
      areLinksEquivalent(links, expectedLinks) &&
      areDependenciesEquivalent(dependencies, expectedDependencies));
  });

  it('should return a valid Component when non required parameters are not set', () => {
    const expectedId = aComponentId();
    const expectedDisplayName = 'A Component';
    const expectedType = aComponentType();
    const expectedVersion = aVersion();

    expect(sut
      .withType(expectedType)
      .withId(expectedId)
      .withVersion(expectedVersion)
      .withDisplayName(expectedDisplayName)
      .build())
      .toSatisfy( ({type, id, version, displayName}: Component) =>
        type.equals(expectedType) &&
        id.equals(expectedId) &&
        version.equals(expectedVersion) &&
        displayName === expectedDisplayName);
  });

  it('should throw a SyntaxError if Component type is not initialized', () => {
    const expectedDisplayName = 'A Component';
    const expectedId = aComponentId();
    const expectedVersion = aVersion();

    expect(() => sut
      .withId(expectedId)
      .withVersion(expectedVersion)
      .withDisplayName(expectedDisplayName)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Component id is not initialized', () => {
    const expectedDisplayName = 'A Component';
    const expectedType = aComponentType();
    const expectedVersion = aVersion();

    expect(() => sut
      .withType(expectedType)
      .withVersion(expectedVersion)
      .withDisplayName(expectedDisplayName)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Component version is not initialized', () => {
    const expectedDisplayName = 'A Component';
    const expectedId = aComponentId();
    const expectedType = aComponentType();
    
    expect(() => sut
      .withId(expectedId)
      .withType(expectedType)
      .withDisplayName(expectedDisplayName)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Component display name is not initialized', () => {
    const expectedId = aComponentId();
    const expectedType = aComponentType();
    const expectedVersion = aVersion();

    expect(() => sut
      .withId(expectedId)
      .withType(expectedType)
      .withVersion(expectedVersion)
      .build()).toThrow(SyntaxError);
  })

  it('should throw a SyntaxError if Component is built without initialization', () => {
    expect(() => sut.build()).toThrow(SyntaxError);
  })
});
