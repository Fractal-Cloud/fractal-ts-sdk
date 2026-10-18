/**
 * offers/vm_sizes.ts — the neutral VM sizes (components/vm_size.ts) in each
 * vendor's machine types, and the shape of a vendor's own type name.
 */
import type {VmSize} from '../components/vm_size';

/** One vendor's reading of `withSize`. */
const sizeTranslation =
  (
    vendor: string,
    types: Readonly<Record<VmSize, string>>,
    ownType: RegExp,
    example: string,
  ) =>
  (value: unknown): string => {
    if (typeof value === 'string' && Object.hasOwn(types, value)) {
      return types[value as VmSize];
    }
    if (typeof value === 'string' && ownType.test(value)) {
      return value;
    }
    throw new Error(
      `size ${JSON.stringify(value)} is neither a neutral size ` +
        `(${Object.keys(types).join(', ')}) nor a ${vendor} machine type such as ${example}`,
    );
  };

export const awsInstanceType = sizeTranslation(
  'AWS',
  {
    small: 't3.small',
    medium: 'm6i.large',
    large: 'm6i.xlarge',
    xlarge: 'm6i.2xlarge',
  },
  /^[a-z][a-z0-9-]*\.[a-z0-9]+$/,
  't3.micro',
);

export const azureVmSize = sizeTranslation(
  'Azure',
  {
    small: 'Standard_B1ms',
    medium: 'Standard_D2s_v5',
    large: 'Standard_D4s_v5',
    xlarge: 'Standard_D8s_v5',
  },
  /^(Standard|Basic)_[A-Za-z0-9_]+$/,
  'Standard_B2s',
);

export const gcpMachineType = sizeTranslation(
  'GCP',
  {
    small: 'e2-small',
    medium: 'e2-standard-2',
    large: 'e2-standard-4',
    xlarge: 'e2-standard-8',
  },
  /^[a-z][a-z0-9]*-[a-z0-9-]+$/,
  'n2-standard-4',
);

export const ociShape = sizeTranslation(
  'OCI',
  {
    small: 'VM.Standard.E2.1.Micro',
    medium: 'VM.Standard.E2.1',
    large: 'VM.Standard.E2.2',
    xlarge: 'VM.Standard.E2.4',
  },
  /^(VM|BM)\.[A-Za-z0-9.]+$/,
  'VM.Standard.E4.Flex',
);
