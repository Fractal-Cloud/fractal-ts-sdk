/** One agent's declaration of an offer: who publishes the contract, at which release. */
export type ContractDeclaration = {
  readonly agentId: string;
  /** The agent release the contract was taken from. */
  readonly agentVersion: string;
  /** `2.N` for a full contract; `1.N` declares only key, type, required and default. */
  readonly contractSchemaVersion: string;
  readonly provider: string;
  /** The offer type this one is an alias of, when the agent serves it under two names. */
  readonly aliasOf?: string;
  /** Cross-parameter rules (aria-spec `ParameterRule`), as declared. */
  readonly parameterRules: readonly unknown[];
};
