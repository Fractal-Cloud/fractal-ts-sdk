/**
 * index_prefix_link.ts — a search link's settings as an agent that grants an
 * index PREFIX reads them (aria-agent-caas-k8s's OpenSearch).
 *
 * That agent reads `indexPrefix` and grants `<indexPrefix>*`, and reads the
 * catalog spelling `accessMode` as it reads `access`. A link written in the
 * catalog vocabulary (`CatalogSearchLink`) names its indices with
 * `indexPattern`: `<prefix>*` becomes `indexPrefix: '<prefix>'`, and any other
 * pattern is refused, because the agent cannot grant it. Every other setting
 * reaches the agent as written; settings it refuses for another reason are
 * left to the offer's `validate`, which names them.
 */
const PREFIX_PATTERN = /^([a-z0-9._-]+)\*$/;

export const indexPrefixLink = (
  settings: Readonly<Record<string, unknown>>,
  fromId: string,
  targetId: string,
): Record<string, unknown> => {
  const {indexPattern, ...rest} = settings;
  if (indexPattern === undefined || rest.indexPrefix !== undefined) {
    return {...settings};
  }
  const prefix =
    typeof indexPattern === 'string'
      ? PREFIX_PATTERN.exec(indexPattern)?.[1]
      : undefined;
  if (prefix === undefined) {
    throw new Error(
      `Live component '${targetId}': the link from '${fromId}' is refused: ` +
        `indexPattern '${String(indexPattern)}' is not '<prefix>*', and this ` +
        "offer's agent grants an index prefix only.",
    );
  }
  return {...rest, indexPrefix: prefix};
};
