import type {ParameterValidationResult} from './parameter_validation_result';

const MAX_LISTED = 5;

/** `<component> <field>: <message>` for each blocking issue, the first few of them. */
const describeBlocking = (result: ParameterValidationResult): string => {
  const lines = [
    ...result.liveSystemIssues.filter(i => i.blocking).map(i => i.message),
    ...result.components.flatMap(c =>
      c.fields.flatMap(f =>
        f.issues
          .filter(i => i.blocking)
          .map(i => `${c.componentId} ${f.field}: ${i.message}`),
      ),
    ),
  ];
  const more =
    lines.length > MAX_LISTED ? `; and ${lines.length - MAX_LISTED} more` : '';
  return lines.slice(0, MAX_LISTED).join('; ') + more;
};

/**
 * A Live System refused before anything was deployed: its component parameters
 * do not satisfy the contracts of the offers selected for them. `result`
 * carries every issue, grouped per component and parameter, as the control
 * plane reported it; it is absent only when the refusal came back from the
 * create or update itself without one.
 */
export class LiveSystemValidationError extends Error {
  override readonly name = 'LiveSystemValidationError';
  readonly liveSystemId: string;
  readonly result: ParameterValidationResult | undefined;

  constructor(
    liveSystemId: string,
    result: ParameterValidationResult | undefined,
    detail?: string,
  ) {
    super(
      `Live System '${liveSystemId}' failed parameter validation: ` +
        (result === undefined
          ? (detail ?? 'refused')
          : describeBlocking(result)),
    );
    this.liveSystemId = liveSystemId;
    this.result = result;
  }
}
