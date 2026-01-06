import {OwnerType} from "./values/owner_type";
import {getOwnerIdBuilder, OwnerId} from "./values/owner_id";
import {getKebabCaseStringBuilder, KebabCaseString} from "./values/kebab_case_string";
import {BoundedContextId, getBoundedContextIdBuilder} from "./bounded_context/id";

  export const aUuid = (): string => crypto.randomUUID();

export const aOwnerId = (): OwnerId => getOwnerIdBuilder()
  .withValue(aUuid())
  .build();

export const aKebabCaseString = (words = 3, segmentLength = 5): KebabCaseString => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const chars = letters + "0123456789";

  const segment = () =>
    letters[Math.floor(Math.random() * letters.length)] +
    Array.from({ length: segmentLength - 1 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return getKebabCaseStringBuilder().withValue(
    Array.from({ length: words }, segment).join("-"))
    .build();
}

export const aBoundedContextId = (type = OwnerType.Personal): BoundedContextId =>
  getBoundedContextIdBuilder()
    .withOwnerType(type)
    .withOwnerId(aOwnerId())
    .withName(aKebabCaseString())
  .build();
