export type ExecutionHandoff = "simulated" | "manual_followup_required";
export type ExecutionMode = "simulation" | "manual";

export interface ExecutionMetadataOptions {
  simulated?: boolean;
  handoff?: ExecutionHandoff;
}

export function resolveExecutionMetadata(options?: ExecutionMetadataOptions): {
  executionMode: ExecutionMode;
  executionHandoff: ExecutionHandoff;
} {
  const executionMode: ExecutionMode = options?.simulated
    ? "simulation"
    : "manual";

  return {
    executionMode,
    executionHandoff:
      options?.handoff ??
      (options?.simulated ? "simulated" : "manual_followup_required"),
  };
}
