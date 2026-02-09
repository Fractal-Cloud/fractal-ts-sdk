import {FractalId, FractalIdBuilder, getFractalIdBuilder} from "./id";
import {BlueprintComponent} from "./component";
import {ServiceAccountCredentials} from "../values/service_account_credentials";
import {FractalBuilder, getFractalBuilder} from "./entity";
import {BlueprintComponentBuilder, getBlueprintComponentBuilder} from "./component/entity";
import {BlueprintComponentTypeBuilder, getBlueprintComponentTypeBuilder} from "./component/type";

export namespace Fractal {
  export type Id = FractalId;
  export namespace Id {
    export type Builder = FractalIdBuilder;
    export const getBuilder = getFractalIdBuilder;
  }

  export type Component = BlueprintComponent;
  export namespace Component {
    export type Builder = BlueprintComponentBuilder;
    export const getBuilder = getBlueprintComponentBuilder;

    export namespace Type {
      export type Builder = BlueprintComponentTypeBuilder;
      export const getBuilder = getBlueprintComponentTypeBuilder;
    }
  }

  export type Builder = FractalBuilder;
  export const getBuilder = getFractalBuilder;
}

export type Fractal = {
  id: Fractal.Id;
  isPrivate: boolean;
  description: string;
  components: Fractal.Component[];
  deploy: (credentials: ServiceAccountCredentials) => Promise<void>;
  destroy: (credentials: ServiceAccountCredentials) => Promise<void>;
};
