/**
 * offers/resource_quantities.ts — a Workload's Kubernetes resource quantities
 * (`250m`, `512Mi`, `1Gi`) in the units each managed container service takes.
 * A value that is not a quantity is refused, not passed on.
 */
const CPU = /^(\d+(?:\.\d+)?)(m?)$/;
const MEMORY = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|k|M|G|T)?$/;
const MEMORY_FACTORS: Readonly<Record<string, number>> = {
  '': 1,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};

const refuse = (what: string, value: unknown): never => {
  throw new Error(
    `${JSON.stringify(value)} is not a Kubernetes ${what} quantity such as ${what === 'CPU' ? '250m or 1' : '512Mi or 1Gi'}`,
  );
};

/** CPU cores: `250m` → 0.25, `1` → 1. */
export const cpuCores = (value: unknown): number => {
  const m = CPU.exec(String(value ?? '').trim());
  if (typeof value === 'number' && value > 0) {
    return value;
  }
  if (m === null) {
    return refuse('CPU', value);
  }
  return m[2] === 'm' ? Number(m[1]) / 1000 : Number(m[1]);
};

const bytes = (value: unknown): number => {
  const m = MEMORY.exec(String(value ?? '').trim());
  if (m === null) {
    return refuse('memory', value);
  }
  return Number(m[1]) * MEMORY_FACTORS[m[2] ?? ''];
};

/** Memory in GiB as Azure Container Apps writes it: `512Mi` → `0.5Gi`. */
export const memoryGi = (value: unknown): string =>
  `${Number((bytes(value) / 1024 ** 3).toFixed(3))}Gi`;

/** CPU in ECS task units (1024 per vCPU), as a string: `250m` → `256`. */
export const ecsCpuUnits = (value: unknown): string =>
  String(Math.round(cpuCores(value) * 1024));

/** Memory in MiB, as an ECS task definition takes it: `1Gi` → `1024`. */
export const ecsMemoryMiB = (value: unknown): string =>
  String(Math.ceil(bytes(value) / 1024 ** 2));
