/**
 * A Live System the SDK refuses before it reaches the control plane: a
 * component names a type no agent claims, a delivery model or provider its
 * offer type is not declared for, or another component the Live System does
 * not have. Submitted, such a component is stored unchecked and never claimed,
 * so it sits in Instantiating with nothing said.
 *
 * `problems` holds one actionable line per defect, each naming the component.
 */
export class LiveSystemStructureError extends Error {
  readonly problems: readonly string[];

  constructor(liveSystemName: string, problems: readonly string[]) {
    super(
      `Live System '${liveSystemName}' cannot be deployed:\n` +
        problems.map(p => `  - ${p}`).join('\n'),
    );
    this.name = 'LiveSystemStructureError';
    this.problems = [...problems];
  }
}
