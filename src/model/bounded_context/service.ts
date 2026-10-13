/**
 * bounded_context/service.ts — create, read, list and delete Bounded Contexts.
 *
 * The control plane's accounts API still calls a Bounded Context a "resource
 * group"; that name stays on the wire and never reaches the SDK surface.
 *
 * Endpoints:
 *   GET           /accounts/me/resourcegroups                     (the caller's)
 *   GET|POST|DEL  /accounts/me/resourcegroups/{shortName}
 *   GET           /organizations/{organizationId}/resourcegroups
 *   GET|POST|DEL  /organizations/{organizationId}/resourcegroups/{shortName}
 *
 * POST is an upsert: it creates the Bounded Context, or updates it in place.
 */
import superagent from 'superagent';
import {send} from '../api-error';
import {apiUrl, authHeaders, pathSegment, type ApiConfig} from '../http';
import type {BoundedContext} from './bounded_context';
import type {BoundedContextDefinition} from './bounded_context_definition';
import type {BoundedContextOwner} from './bounded_context_owner';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The collection path of an owner's Bounded Contexts, checked before use. */
const collection = (owner: BoundedContextOwner): string => {
  if (owner.type === 'Personal') {
    return '/accounts/me/resourcegroups';
  }
  if (owner.ownerId === undefined || owner.ownerId.trim().length === 0) {
    throw new Error(
      'An organizational Bounded Context requires the ownerId of the organization.',
    );
  }
  if (!GUID_RE.test(owner.ownerId)) {
    throw new Error(
      `An organizational Bounded Context's ownerId must be the organization's GUID, got '${owner.ownerId}'.`,
    );
  }
  return `/organizations/${pathSegment(owner.ownerId)}/resourcegroups`;
};

const item = (owner: BoundedContextOwner, shortName: string): string => {
  const path = collection(owner);
  if (shortName === undefined || shortName.trim().length === 0) {
    throw new Error('A Bounded Context requires a shortName.');
  }
  return `${path}/${pathSegment(shortName)}`;
};

const unexpected = (what: string, path: string, detail: string): Error =>
  new Error(
    `Unexpected response from ${what}: ${path} ${detail}. ` +
      'The control plane and this SDK version may disagree on the response shape.',
  );

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const strings = (what: string, path: string, v: unknown): string[] => {
  if (v === undefined || v === null) {
    return [];
  }
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
    throw unexpected(what, path, 'is not a list of strings');
  }
  return [...v];
};

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Maps one answer of the accounts API, refusing a shape it cannot read. */
const boundedContext = (
  what: string,
  path: string,
  v: unknown,
): BoundedContext => {
  if (!isObject(v)) {
    throw unexpected(what, path, 'is not an object');
  }
  const id = v.id;
  if (
    !isObject(id) ||
    (id.resourceGroupType !== 'Personal' &&
      id.resourceGroupType !== 'Organizational') ||
    typeof id.ownerId !== 'string' ||
    typeof id.shortName !== 'string'
  ) {
    throw unexpected(what, `${path}.id`, 'is not a Bounded Context id');
  }
  const type = id.resourceGroupType;
  return {
    id: {type, ownerId: id.ownerId, shortName: id.shortName},
    qualifiedId: `${type}/${id.ownerId}/${id.shortName}`,
    displayName: text(v.displayName),
    description: text(v.description),
    icon: typeof v.icon === 'string' ? v.icon : null,
    status: typeof v.status === 'string' ? v.status : 'Unknown',
    liveSystemIds: strings(what, `${path}.livesystems`, v.livesystems),
    fractalIds: strings(what, `${path}.fractals`, v.fractals),
  };
};

/** Create a Bounded Context, or update it in place when it exists. */
export async function createBoundedContext(
  definition: BoundedContextDefinition,
  cfg: ApiConfig,
): Promise<BoundedContext> {
  const path = item(definition, definition.shortName);
  if (
    definition.displayName === undefined ||
    definition.displayName.trim().length === 0
  ) {
    throw new Error('A Bounded Context requires a displayName.');
  }
  const body: Record<string, string> = {displayName: definition.displayName};
  if (definition.description !== undefined) {
    body.description = definition.description;
  }
  if (definition.icon !== undefined) {
    body.icon = definition.icon;
  }
  const res = await send(cfg, () =>
    superagent
      .post(apiUrl(cfg, path))
      .ok(r => r.status === 200 || r.status === 201)
      .set(authHeaders(cfg))
      .send(body),
  );
  return boundedContext(
    `POST ${collection(definition)}/{shortName}`,
    'body',
    res.body,
  );
}

/** Read one Bounded Context; `null` when the owner has none by that name. */
export async function getBoundedContext(
  owner: BoundedContextOwner,
  shortName: string,
  cfg: ApiConfig,
): Promise<BoundedContext | null> {
  const path = item(owner, shortName);
  const res = await send(cfg, () =>
    superagent
      .get(apiUrl(cfg, path))
      .ok(r => r.status === 200 || r.status === 404)
      .set(authHeaders(cfg)),
  );
  if (res.status !== 200) {
    return null;
  }
  return boundedContext(
    `GET ${collection(owner)}/{shortName}`,
    'body',
    res.body,
  );
}

/** List an owner's Bounded Contexts; `[]` when there are none. */
export async function listBoundedContexts(
  owner: BoundedContextOwner,
  cfg: ApiConfig,
): Promise<BoundedContext[]> {
  const path = collection(owner);
  const res = await send(cfg, () =>
    superagent
      .get(apiUrl(cfg, path))
      .ok(r => r.status === 200)
      .set(authHeaders(cfg)),
  );
  const what = `GET ${path}`;
  if (!Array.isArray(res.body)) {
    throw unexpected(what, 'body', 'is not an array');
  }
  return res.body.map((v: unknown, i: number) =>
    boundedContext(what, `[${i}]`, v),
  );
}

/** Delete a Bounded Context. */
export async function deleteBoundedContext(
  owner: BoundedContextOwner,
  shortName: string,
  cfg: ApiConfig,
): Promise<void> {
  const path = item(owner, shortName);
  await send(cfg, () =>
    superagent
      .delete(apiUrl(cfg, path))
      .ok(r => r.status === 200 || r.status === 204)
      .set(authHeaders(cfg)),
  );
}
