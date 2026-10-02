/**
 * ci/adapters/read_json.ts — read a token endpoint's JSON answer without ever
 * quoting it: a parse error's message carries a snippet of the body, and on a
 * success answer that snippet would be part of a token.
 */
export const readJson = async (
  res: Response,
  what: string,
): Promise<unknown> => {
  try {
    return (await res.json()) as unknown;
  } catch {
    throw new Error(`${what} answered with a body that is not JSON.`);
  }
};
