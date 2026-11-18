/**
 * search_link_settings.ts — the settings of a consumer → `Storage.Search` link.
 *
 *   bp.link(service, search, searchLinkSettings({access: 'read'}));
 *   bp.link(service, search, searchLinkSettings({
 *     access: 'read-write',
 *     indexPrefix: 'orders-',
 *   }));
 *   bp.link(service, search, searchLinkSettings({
 *     accessMode: 'readWrite',
 *     indexPattern: 'orders-*',
 *   }));
 *
 * Refuses, when called, settings no search component's agent would accept.
 */
import type {CatalogSearchLink} from './catalog_search_link';
import type {SearchLink} from './search_link';
import {searchLinkRefusal} from './search_link_refusal';

/** Build the settings map of a consumer → search link. */
export const searchLinkSettings = (
  link: SearchLink | CatalogSearchLink,
): Record<string, string> => {
  const refusal = searchLinkRefusal(link);
  if (refusal !== undefined) {
    throw new Error(`Search link refused: ${refusal}.`);
  }
  // `access` wins when both are set, as it does for the agents.
  if (!('access' in link)) {
    const settings: Record<string, string> = {accessMode: link.accessMode};
    if (link.indexPattern !== undefined) {
      settings.indexPattern = link.indexPattern;
    }
    return settings;
  }
  const settings: Record<string, string> = {access: link.access};
  if (link.indexPrefix !== undefined) {
    settings.indexPrefix = link.indexPrefix;
  }
  return settings;
};
