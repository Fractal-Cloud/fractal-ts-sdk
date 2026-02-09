export const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '';
