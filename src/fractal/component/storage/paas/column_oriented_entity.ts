import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `ColumnOrientedEntity` — the abstract Storage capability "I need a
 * column-oriented (wide-column) entity". It is satisfied by candidate Offers
 * (e.g. GcpBigTableTable on GCP). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none yet — every knob
 * exposed by the sole GCP offer (tableId, columnFamilies, splitKeys) is
 * vendor-only and lives on that offer, NOT on this Interface.
 *
 * Catalog dependency: this capability depends on a `ColumnOrientedDbms`. The
 * authoring infra team declares that dependency through `dependencies` so it
 * flows to whichever offer the provider selects.
 */
export type ColumnOrientedEntityConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this column-oriented entity. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ColumnOrientedEntity {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ColumnOrientedEntity';

  export const create = (
    config: ColumnOrientedEntityConfig,
  ): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Storage,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
