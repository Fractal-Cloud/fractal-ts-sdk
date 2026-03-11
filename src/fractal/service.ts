import {ServiceAccountCredentials} from '../values/service_account_credentials';
import {Fractal} from './index';
import superagent from 'superagent';
import {debugRequest, debugResponse} from '../debug';

const CLIENT_ID_HEADER = 'X-ClientID';
const CLIENT_SECRET_HEADER = 'X-ClientSecret';
const FRACTAL_API_URL = 'https://api.fractal.cloud';

/**
 * Converts a raw superagent error into a descriptive Error with context.
 * Includes the operation name, target ID, HTTP status (if any), and response
 * body (if any) so the caller always knows what went wrong and where.
 */
const toApiError = (operation: string, target: string, err: unknown): Error => {
  const e = err as {status?: number; response?: {text?: string}};
  const status = e.status ? `HTTP ${e.status}` : 'network error';
  const body = e.response?.text?.trim();
  const detail = body ? ` — ${body}` : '';
  return new Error(`${operation} failed (${status}) for ${target}${detail}`);
};

const authHeaders = (credentials: ServiceAccountCredentials) => ({
  [CLIENT_ID_HEADER]: credentials.id.serviceAccountIdValue,
  [CLIENT_SECRET_HEADER]: credentials.secret,
});

const deployFractal = async (
  credentials: ServiceAccountCredentials,
  fractal: Fractal,
) => {
  const target = fractal.id.toString();
  const fractalUrl = `${FRACTAL_API_URL}/blueprints/${target.replace(':', '/')}`;

  let getFractalResponse;
  debugRequest('GET', fractalUrl, undefined, 'existence check');
  try {
    getFractalResponse = await superagent
      .get(fractalUrl)
      .ok(res => res.status === 200 || res.status === 404)
      .set(authHeaders(credentials))
      .send();
    debugResponse(
      'GET',
      fractalUrl,
      getFractalResponse.status,
      getFractalResponse.body,
      'existence check',
    );
  } catch (err) {
    const e = err as {status?: number; response?: {body?: unknown}};
    debugResponse(
      'GET',
      fractalUrl,
      e.status ?? 0,
      e.response?.body,
      'existence check',
    );
    throw toApiError('check fractal existence', target, err);
  }

  const method = getFractalResponse.status === 200 ? 'PUT' : 'POST';
  const request =
    getFractalResponse.status === 200
      ? superagent.put(fractalUrl)
      : superagent.post(fractalUrl);

  const body = {
    description: fractal.description,
    isPrivate: fractal.isPrivate,
    components: fractal.components.map(c => ({
      type: c.type.toString(),
      id: c.id.value.toString(),
      version: c.version.toString(),
      displayName: c.displayName,
      description: c.description,
      parameters: c.parameters.toMap(),
      dependencies: c.dependencies.map(d => d.id.value.toString()),
      links: c.links.map(l => ({
        componentId: l.id.value.toString(),
        settings: l.parameters.toMap(),
      })),
      outputFields: Object.keys(c.outputFields.value),
      isLocked: c.isLocked,
      recreateOnFailure: c.recreateOnFailure,
    })),
  };

  debugRequest(method, fractalUrl, body);
  try {
    const response = await request.set(authHeaders(credentials)).send(body);
    debugResponse(method, fractalUrl, response.status, response.body);
  } catch (err) {
    const e = err as {status?: number; response?: {body?: unknown}};
    debugResponse(method, fractalUrl, e.status ?? 0, e.response?.body);
    const op =
      getFractalResponse.status === 200 ? 'update fractal' : 'create fractal';
    throw toApiError(op, target, err);
  }
};

const destroyFractal = async (
  credentials: ServiceAccountCredentials,
  id: Fractal.Id,
) => {
  const target = id.toString();
  const url = `${FRACTAL_API_URL}/blueprints/${target.replace(':', '/')}`;
  debugRequest('DELETE', url);
  try {
    const response = await superagent.delete(url).set(authHeaders(credentials));
    debugResponse('DELETE', url, response.status, response.body);
  } catch (err) {
    const e = err as {status?: number; response?: {body?: unknown}};
    debugResponse('DELETE', url, e.status ?? 0, e.response?.body);
    throw toApiError('destroy fractal', target, err);
  }
};

export namespace FractalService {
  export const deploy = deployFractal;
  export const destroy = destroyFractal;
}
