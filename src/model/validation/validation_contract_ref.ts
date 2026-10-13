/** Which offer contract produced a component's issues (`ValidationContractRef`). */
export type ValidationContractRef = {
  readonly schemaVersion: string | null;
  readonly digest: string | null;
  readonly declaredBy: string | null;
  readonly agentVersion: string | null;
};
