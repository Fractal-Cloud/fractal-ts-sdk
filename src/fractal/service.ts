import {ServiceAccountCredentials} from "../values/service_account_credentials";
import {Fractal} from "./index";
import superagent from 'superagent';

const CLIENT_ID_HEADER = "X-ClientID";
const CLIENT_SECRET_HEADER = "X-ClientSecret";
const FRACTAL_API_URL = "https://api.fractal.cloud";

const deployFractal = async (credentials: ServiceAccountCredentials, fractal: Fractal) => {
  await superagent
    .post(`${FRACTAL_API_URL}/blueprints/${fractal.id.toString().replace(':', '/')}`)
    .set(CLIENT_ID_HEADER, credentials.id.serviceAccountIdValue)
    .set(CLIENT_SECRET_HEADER, credentials.secret)
    .send({
      description: fractal.description,
      isPrivate: fractal.isPrivate,
      components: fractal.components.map(c => ({
        ...c,
        type: c.type.toString(),
        id: c.id.value.kebabValue,
        version: c.version.toString(),
        parameters: c.parameters.toMap(),
        dependencies: c.dependencies.map(d => d.id.value.kebabValue),
        links: c.links.map(l => ({
          componentId: l.id.value.kebabValue,
          settings: l.parameters.toMap()
        })),
        outputFields: Object.keys(c.outputFields.value)
      }))
    }).catch(e => console.error(e.message, e.response.text));
}

const destroyFractal = async (credentials: ServiceAccountCredentials, id: Fractal.Id) => {
  await superagent
    .delete(`${FRACTAL_API_URL}/blueprints/${id.toString().replace(':', '/')}`)
    .set(CLIENT_ID_HEADER, credentials.id.serviceAccountIdValue)
    .set(CLIENT_SECRET_HEADER, credentials.secret);
}

export namespace FractalService {
  export const deploy = deployFractal;
  export const destroy = destroyFractal;
}

