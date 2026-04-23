import type { ExecutionMetadataOptions } from "@/lib/async-metadata";
import { db } from "@/lib/db";
import { agentJobs, deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const ASYNC_SIMULATION_TIMINGS_MS = {
  deploymentStart: 500,
  deploymentFinish: 3000,
  agentJobStart: 500,
  agentJobFinish: 5000,
} as const;

export type AsyncExecutionMode = "simulation" | "manual";

export interface AsyncEnqueueResult {
  mode: AsyncExecutionMode;
  handoff: "simulated" | "manual_followup_required";
}

interface SimulationPhase {
  delayMs: number;
  task: () => Promise<void>;
}

export function getDeploymentExecutionStrategy(): AsyncEnqueueResult {
  const mode = getAsyncExecutionMode();
  return {
    mode,
    handoff: mode === "simulation" ? "simulated" : "manual_followup_required",
  };
}

export function getAgentJobExecutionStrategy(): AsyncEnqueueResult {
  const mode = getAsyncExecutionMode();
  return {
    mode,
    handoff: mode === "simulation" ? "simulated" : "manual_followup_required",
  };
}

export function getDeploymentExecutionMetadata(
  status: string,
): ExecutionMetadataOptions {
  const simulated = isAsyncSimulationEnabled();
  return {
    simulated,
    handoff:
      simulated || status !== "queued"
        ? "simulated"
        : "manual_followup_required",
  };
}

export function getAgentJobExecutionMetadata(
  status: string,
): ExecutionMetadataOptions {
  const simulated = isAsyncSimulationEnabled();
  return {
    simulated,
    handoff:
      simulated || status !== "pending"
        ? "simulated"
        : "manual_followup_required",
  };
}

export function isAsyncSimulationEnabled() {
  return process.env.ENABLE_ASYNC_SIMULATION === "true";
}

export function getAsyncExecutionMode(): AsyncExecutionMode {
  return isAsyncSimulationEnabled() ? "simulation" : "manual";
}

function scheduleSimulation(delayMs: number, task: () => Promise<void>) {
  setTimeout(async () => {
    try {
      await task();
    } catch {
      // Simulation mode only
    }
  }, delayMs);
}

function scheduleSimulationPhases(phases: SimulationPhase[]) {
  for (const phase of phases) {
    scheduleSimulation(phase.delayMs, phase.task);
  }
}

function buildDeploymentSimulationPlan(
  deploymentId: string,
  projectId: string,
): SimulationPhase[] {
  return [
    {
      delayMs: ASYNC_SIMULATION_TIMINGS_MS.deploymentStart,
      task: async () => {
        await db
          .update(deployments)
          .set({ status: "in_progress", startedAt: new Date() })
          .where(
            and(
              eq(deployments.id, deploymentId),
              eq(deployments.status, "queued"),
            ),
          );
        await db
          .update(projects)
          .set({ status: "deploying" })
          .where(eq(projects.id, projectId));
      },
    },
    {
      delayMs: ASYNC_SIMULATION_TIMINGS_MS.deploymentFinish,
      task: async () => {
        await db
          .update(deployments)
          .set({ status: "succeeded", endedAt: new Date() })
          .where(
            and(
              eq(deployments.id, deploymentId),
              eq(deployments.status, "in_progress"),
            ),
          );
        await db
          .update(projects)
          .set({ status: "active" })
          .where(eq(projects.id, projectId));
      },
    },
  ];
}

function buildAgentJobSimulationPlan(jobId: string): SimulationPhase[] {
  return [
    {
      delayMs: ASYNC_SIMULATION_TIMINGS_MS.agentJobStart,
      task: async () => {
        await db
          .update(agentJobs)
          .set({ status: "running", updatedAt: new Date() })
          .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "pending")));
      },
    },
    {
      delayMs: ASYNC_SIMULATION_TIMINGS_MS.agentJobFinish,
      task: async () => {
        await db
          .update(agentJobs)
          .set({
            status: "succeeded",
            prUrl: `https://github.com/org/repo/pull/${Math.floor(Math.random() * 1000)}`,
            updatedAt: new Date(),
          })
          .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "running")));
      },
    },
  ];
}

async function enqueueSimulatedDeployment(
  deploymentId: string,
  projectId: string,
) {
  scheduleSimulationPhases(
    buildDeploymentSimulationPlan(deploymentId, projectId),
  );
}

async function enqueueSimulatedAgentJob(jobId: string) {
  scheduleSimulationPhases(buildAgentJobSimulationPlan(jobId));
}

export async function enqueueAgentJob(
  jobId: string,
): Promise<AsyncEnqueueResult> {
  const strategy = getAgentJobExecutionStrategy();

  if (strategy.mode !== "simulation") {
    return strategy;
  }

  await enqueueSimulatedAgentJob(jobId);
  return strategy;
}

export async function enqueueDeployment(
  deploymentId: string,
  projectId: string,
): Promise<AsyncEnqueueResult> {
  const strategy = getDeploymentExecutionStrategy();

  if (strategy.mode !== "simulation") {
    return strategy;
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
  return strategy;
}

export async function enqueuePreviewDeployment(
  deploymentId: string,
  projectId: string,
): Promise<AsyncEnqueueResult> {
  const strategy = getDeploymentExecutionStrategy();

  if (strategy.mode !== "simulation") {
    return strategy;
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
  return strategy;
}
