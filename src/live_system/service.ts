import {ServiceAccountCredentials} from '../values/service_account_credentials';
import superagent from 'superagent';
import {LiveSystem} from './index';

const CLIENT_ID_HEADER = 'X-ClientID';
const CLIENT_SECRET_HEADER = 'X-ClientSecret';
const FRACTAL_API_URL = 'https://api.fractal.cloud';

const deployLiveSystem = async (
  credentials: ServiceAccountCredentials,
  liveSystem: LiveSystem,
) => {
  await superagent
    .post(`${FRACTAL_API_URL}/livesystems`)
    .set(CLIENT_ID_HEADER, credentials.id.serviceAccountIdValue)
    .set(CLIENT_SECRET_HEADER, credentials.secret)
    .send({
      liveSystemId: liveSystem.id.toString(),
      fractalId: liveSystem.fractalId.toString(),
      description: liveSystem.description,
      provider: liveSystem.genericProvider,
      blueprintMap: liveSystem.components.reduce(
        (acc, c) => {
          acc[c.id.value.toString()] = {
            ...c,
            type: c.type.toString(),
            id: c.id.value.toString(),
            version: c.version.toString(),
            parameters: c.parameters.toMap(),
            dependencies: c.dependencies.map(d => d.id.value.toString()),
            links: c.links.map(l => ({
              componentId: l.id.value.toString(),
              settings: l.parameters.toMap(),
            })),
            outputFields: c.outputFields.value,
          };
          return acc;
        },
        {} as Record<string, {}>,
      ),
      parameters: liveSystem.parameters.toMap(),
      environment: {
        id: {
          type: liveSystem.environment.id.ownerType,
          ownerId: liveSystem.environment.id.ownerId.ownerIdValue.toString(),
          shortName: liveSystem.environment.id.name,
        },
        parameters: liveSystem.environment.parameters.toMap(),
      },
    })
    .catch(e => console.error(e.message, e.response.text));
};

const destroyLiveSystem = async (
  credentials: ServiceAccountCredentials,
  id: LiveSystem.Id,
) => {
  await superagent
    .delete(`${FRACTAL_API_URL}/livesystems/${id.toString()}`)
    .set(CLIENT_ID_HEADER, credentials.id.serviceAccountIdValue)
    .set(CLIENT_SECRET_HEADER, credentials.secret);
};

export namespace LiveSystemService {
  export const deploy = deployLiveSystem;
  export const destroy = destroyLiveSystem;
}
