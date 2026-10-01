/**
 * environment/parameters.ts — case-insensitive parameter-key lookup.
 *
 * The control plane looks environment parameters up case-insensitively
 * (`networkTier` and `NetworkTier` are the same key), so every SDK-side read of a
 * parameter it also reads goes through here.
 */

/** The value stored under `key`, matched case-insensitively; `undefined` if absent. */
export const findParameter = (
  parameters: Readonly<Record<string, unknown>> | null | undefined,
  key: string,
): unknown => {
  const wanted = key.toLowerCase();
  const found = Object.keys(parameters ?? {}).find(
    k => k.toLowerCase() === wanted,
  );
  return found === undefined ? undefined : parameters![found];
};
