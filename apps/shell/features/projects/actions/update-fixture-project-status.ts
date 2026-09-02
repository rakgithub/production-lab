"use server";

import { revalidatePath } from "next/cache";

import { fixtureProjectDataSource } from "../data/fixture-project-data-source";
import type { ProjectStatus } from "../model";

const projectStatuses: ProjectStatus[] = ["PLANNED", "ACTIVE", "PAUSED"];

type UpdateProjectStatusInput = {
  expectedVersion: number;
  projectId: string;
  status: ProjectStatus;
};

function isUpdateProjectStatusInput(
  input: unknown,
): input is UpdateProjectStatusInput {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<UpdateProjectStatusInput>;

  return (
    typeof candidate.projectId === "string" &&
    /^[a-z0-9-]+$/.test(candidate.projectId) &&
    candidate.projectId.length <= 100 &&
    typeof candidate.expectedVersion === "number" &&
    Number.isInteger(candidate.expectedVersion) &&
    candidate.expectedVersion >= 0 &&
    typeof candidate.status === "string" &&
    projectStatuses.includes(candidate.status as ProjectStatus)
  );
}

export async function updateFixtureProjectStatus(input: unknown) {
  if (!isUpdateProjectStatusInput(input)) {
    return {
      message: "The status change request is invalid.",
      ok: false as const,
    };
  }

  try {
    const project = await fixtureProjectDataSource.updateStatus(
      input.projectId,
      input.status,
      input.expectedVersion,
    );

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.id}`);

    return {
      ok: true as const,
      project: {
        status: project.status,
        version: project.version,
      },
    };
  } catch {
    return {
      message: "The project changed or could not be updated. Refresh and try again.",
      ok: false as const,
    };
  }
}
