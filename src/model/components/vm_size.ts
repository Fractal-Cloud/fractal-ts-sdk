/**
 * The vendor-neutral sizes `VirtualMachine.withSize` takes. Each VM offer
 * maps them to one of its own machine types (`offers/vm_sizes.ts`); a
 * vendor's own type name is accepted too, by that vendor's offer only.
 *
 * | size | vCPU | memory |
 * |---|---|---|
 * | `small` | 1–2 | 1–2 GiB (burstable) |
 * | `medium` | 2 | 8 GiB |
 * | `large` | 4 | 16 GiB |
 * | `xlarge` | 8 | 32 GiB |
 */
export type VmSize = 'small' | 'medium' | 'large' | 'xlarge';
