import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  CATALOGUE_COMPONENT_TYPES,
  catalogueComponentType,
} from './catalogue_component_types';

const COMPONENTS_DIR = join(__dirname, 'components');

/** Every abstract tag a component factory passes to `newNode`. */
const abstractTags = (): string[] => {
  const tags = new Set<string>();
  for (const file of readdirSync(COMPONENTS_DIR)) {
    if (!file.endsWith('.ts') || file.includes('.test')) {
      continue;
    }
    const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
    for (const m of source.matchAll(/newNode\(\s*[^,]+,\s*'([A-Za-z.]+)'/g)) {
      tags.add(m[1]);
    }
  }
  return [...tags];
};

describe('catalogueComponentType', () => {
  it('names the delivery model for the reported BigData components', () => {
    expect(catalogueComponentType('BigData.DistributedDataProcessing')).toBe(
      'BigData.PaaS.DistributedDataProcessing',
    );
    expect(catalogueComponentType('BigData.ComputeCluster')).toBe(
      'BigData.PaaS.ComputeCluster',
    );
  });

  it('uses the catalogue spelling where it differs from the SDK', () => {
    expect(catalogueComponentType('Storage.ObjectStorage')).toBe(
      'Storage.PaaS.FilesAndBlobs',
    );
    expect(catalogueComponentType('APIManagement.ApiGateway')).toBe(
      'APIManagement.PaaS.APIGateway',
    );
  });

  it('leaves an unmapped tag unchanged', () => {
    expect(catalogueComponentType('Unmanaged')).toBe('Unmanaged');
    expect(catalogueComponentType('Vendor.Custom')).toBe('Vendor.Custom');
  });

  it('maps every abstract component the SDK can author, except Unmanaged', () => {
    const unmapped = abstractTags().filter(
      t => t !== 'Unmanaged' && !(t in CATALOGUE_COMPONENT_TYPES),
    );
    expect(unmapped).toEqual([]);
  });

  it('only maps to a type that names a delivery model, or is already catalogue-shaped', () => {
    for (const [abstract, catalogue] of Object.entries(
      CATALOGUE_COMPONENT_TYPES,
    )) {
      const parts = catalogue.split('.');
      const named = ['IaaS', 'PaaS', 'CaaS', 'SaaS', 'FaaS'].includes(parts[1]);
      expect(named || catalogue === abstract, abstract).toBe(true);
    }
  });
});
