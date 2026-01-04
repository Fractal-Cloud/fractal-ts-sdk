/**
 * Enum representing the type of ownership for an entity.
 *
 * This enumeration can be used to differentiate between entities owned by individuals
 * and those owned by organizations.
 *
 * @enum {string}
 * @readonly
 * @property {string} Personal - Represents ownership by an individual person.
 * @property {string} Organizational - Represents ownership by an organization or group.
 */
export enum OwnerType {
  Personal = 'Personal',
  Organizational = 'Organizational',
}
