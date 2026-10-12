/** How to fix a validation issue (`ValidationFix`). */
export type ValidationFix = {
  readonly text: string;
  /** The JSON pointer an interface may jump to or offer to set. */
  readonly setField: string | null;
  readonly allowedValues: readonly string[] | null;
  readonly example: unknown;
  /** The rendered condition that made the field required. */
  readonly requiredBecause: string | null;
};
