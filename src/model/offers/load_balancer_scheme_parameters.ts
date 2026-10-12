/**
 * offers/load_balancer_scheme_parameters.ts — the neutral `scheme` guardrail
 * (`LoadBalancer.withScheme`) in each agent's vocabulary.
 *
 * Every LoadBalancer agent reads the exposure under `lbScheme`, never `scheme`
 * (AWS `LoadBalancerConfig`, Azure `AzureLoadBalancerConfig`, GCP
 * `GcpLoadBalancerConfig`), and they disagree on the value: AWS and Azure take
 * the neutral spelling, GCP hands it to the forwarding rule's
 * `loadBalancingScheme` and so needs `INTERNAL` / `EXTERNAL`.
 */
import type {LoadBalancerScheme} from '../components/load_balancer_scheme';
import type {VendorParameters} from './vendor_parameters';

const SCHEMES: readonly LoadBalancerScheme[] = ['internal', 'internet-facing'];

const isScheme = (value: unknown): value is LoadBalancerScheme =>
  SCHEMES.includes(value as LoadBalancerScheme);

/**
 * Replaces a neutral `scheme` with the agent's key (`lbScheme`, named through
 * the offer's contract) spelled by `vendorValue`. An unset
 * scheme emits nothing, so the agent's own default applies. A value outside the
 * neutral vocabulary is refused rather than forwarded, since an agent would
 * either reject it or quietly read it as its default.
 */
export const toLbScheme =
  (
    vendorKey: string,
    vendorValue: (scheme: LoadBalancerScheme) => string,
  ): VendorParameters =>
  (componentId, parameters) => {
    if (parameters.scheme === undefined) {
      return parameters;
    }
    const {scheme, ...rest} = parameters;
    if (!isScheme(scheme)) {
      throw new Error(
        `LoadBalancer '${componentId}': scheme '${String(scheme)}' is not ` +
          "'internal' or 'internet-facing'.",
      );
    }
    return {...rest, [vendorKey]: vendorValue(scheme)};
  };
