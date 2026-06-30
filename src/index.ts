/**
 * @fractal_cloud/sdk — package root.
 *
 * The SDK is the locked Fractal + Interface + offer-selection model (see
 * docs/fractal-model.md): a vendor-agnostic blueprint of abstract Components, a
 * typed application-level Interface, guardrail parameters, and a LiveSystem built
 * exclusively by per-component offer selection.
 *
 * The package root and the `./model` subpath expose the same surface. The earlier
 * interim model (createFractal-with-offers + global-provider toLiveSystem) has
 * been retired.
 */
export * from './model';
