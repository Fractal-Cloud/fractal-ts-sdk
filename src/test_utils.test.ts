import {OwnerType} from "./values/owner_type";
import {OwnerId} from "./values/owner_id";
import {getKebabCaseStringBuilder, KebabCaseString} from "./values/kebab_case_string";
import {BoundedContextId, getBoundedContextIdBuilder} from "./bounded_context/id";
import {ComponentId} from "./component/id";
import {ComponentType} from "./component/type";
import {InfrastructureDomain} from "./values/infrastructure_domain";
import {getVersionBuilder, Version} from "./values/version";
import {Component} from "./component";
import {ComponentDependency} from "./component/dependency";
import {getPascalCaseStringBuilder, PascalCaseString} from "./values/pascal_case_string";

const MAX_ITERATIONS = 3;

export const aUuid = (): string => crypto.randomUUID();

export const aOwnerId = (): OwnerId => OwnerId.getBuilder()
  .withValue(aUuid())
  .build();

const segment = (segmentLength: number): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const chars = letters + "0123456789";

  return letters[Math.floor(Math.random() * letters.length)] +
    Array.from({ length: segmentLength - 1 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

export const aKebabCaseString = (words = 3, segmentLength = 5): KebabCaseString => {
  return getKebabCaseStringBuilder().withValue(
    Array.from({ length: words }, () => segment(segmentLength)).join("-"))
    .build();
}

export const aPascalCaseString = (words = 3, segmentLength = 5): PascalCaseString => {
  return getPascalCaseStringBuilder().withValue(
    Array.from({ length: words }, () => segment(segmentLength).charAt(0).toUpperCase()).join(''))
    .build();
}

export const aBoundedContextId = (type = OwnerType.Personal): BoundedContextId =>
  getBoundedContextIdBuilder()
    .withOwnerType(type)
    .withOwnerId(aOwnerId())
    .withName(aKebabCaseString())
  .build();

export const aComponentId = (): ComponentId => Component.Id.getBuilder()
  .withValue(aKebabCaseString())
  .build();

export const aComponentType = (): ComponentType => Component.Type.getBuilder()
  .withInfrastructureDomain(InfrastructureDomain.Storage)
  .withName(aPascalCaseString())
  .build();

export const aPositiveInteger = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;

export const aVersion = (): Version => getVersionBuilder()
  .withMajor(aPositiveInteger())
  .withMinor(aPositiveInteger())
  .withPatch(aPositiveInteger())
  .build();


export const aMap = () => {
  const accumulator: Record<string, object> = {};
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    accumulator[`key_${aPositiveInteger()}`] = {[`value_${aPositiveInteger()}`]: aKebabCaseString().kebabValue};
  }
  return accumulator;
}
export const aParameters = () => {
  const params = Component.Parameters.getInstance();
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    params.push(`param_${aPositiveInteger()}`, aMap());
  }
  return params;
};

export const aComponentLink = (): Component.Link => Component.Link.getBuilder()
  .withId(aComponentId())
  .withType(aComponentType())
  .withParameters(aParameters())
  .build();

export const aComponentDependency = (): Component.Dependency => ({type: aComponentType()});

export const manyComponentLinks = (): Component.Link[] => {
  const links: Component.Link[] = [];
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    links.push(aComponentLink());
  }
  return links;
}

export const manyComponentDependencies = (): Component.Dependency[] => {
  const accumulator: ComponentDependency[] = [];
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    accumulator.push(aComponentDependency());
  }
  return accumulator;
}

export const deepEqual = (a: any, b: any): boolean => {
  if (Object.is(a, b)) return true;

  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }

  if (a.constructor !== b.constructor) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (a instanceof Date) {
    return a.getTime() === b.getTime();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
