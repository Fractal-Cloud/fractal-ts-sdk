export const isValidUuid = (value: string): string[] => {
  const isValidUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  if (!isValidUuid) {
    return [` Value '${value}' must be a valid uuid`];
  }
  return [] as const;
};
