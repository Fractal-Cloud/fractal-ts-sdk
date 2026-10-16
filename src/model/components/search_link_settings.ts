/**
 * search_link_settings.ts — the settings of a consumer → `Storage.Search` link.
 *
 *   bp.link(service, search, searchLinkSettings({access: 'read'}));
 *   bp.link(service, search, searchLinkSettings({
 *     access: 'read-write',
 *     indexPrefix: 'orders-',
 *   }));
 *
 * Refuses, when called, settings the search component's agent would refuse.
 */
import type {SearchLink} from './search_link';
import {searchLinkRefusal} from './search_link_refusal';

/** Build the settings map of a consumer → search link. */
export const searchLinkSettings = (
  link: SearchLink,
): Record<string, string> => {
  const refusal = searchLinkRefusal(link);
  if (refusal !== undefined) {
    throw new Error(`Search link refused: ${refusal}.`);
  }
  const settings: Record<string, string> = {access: link.access};
  if (link.indexPrefix !== undefined) {
    settings.indexPrefix = link.indexPrefix;
  }
  return settings;
};
