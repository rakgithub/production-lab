import type {
  ProjectDataSource,
  ProjectListInput,
  ProjectListResult,
} from "../model/project-repository";
import type { Project, ProjectStatus } from "../model/project";

import { activities, projects } from "./fixtures/project-fixtures";

function compareProjects(
  left: Project,
  right: Project,
  input: ProjectListInput,
): number {
  const leftValue = left[input.sort];
  const rightValue = right[input.sort];

  const result = leftValue.localeCompare(rightValue);

  if (result !== 0) {
    return input.direction === "asc" ? result : -result;
  }

  return left.id.localeCompare(right.id);
}

export const fixtureProjectDataSource: ProjectDataSource = {
  async list(input): Promise<ProjectListResult> {
    let result = [...projects];

    if (input.query) {
      const query = input.query.toLowerCase();

      result = result.filter((project) =>
        project.name.toLowerCase().includes(query),
      );
    }

    if (input.status) {
      result = result.filter(
        (project) => project.status === input.status,
      );
    }

    result.sort((left, right) =>
      compareProjects(left, right, input),
    );

    const startIndex = input.after
      ? result.findIndex((project) => project.id === input.after) + 1
      : 0;

    const safeStartIndex = Math.max(startIndex, 0);
    const items = result.slice(
      safeStartIndex,
      safeStartIndex + input.first,
    );

    const lastProject = items.at(-1);
    const hasNextPage =
      safeStartIndex + items.length < result.length;

    return {
      items,
      totalCount: result.length,
      pageInfo: {
        endCursor: hasNextPage
          ? (lastProject?.id ?? null)
          : null,
        hasNextPage,
      },
    };
  },

  async getById(id) {
    return projects.find((project) => project.id === id) ?? null;
  },

  async updateStatus(
    id: string,
    status: ProjectStatus,
    expectedVersion: number,
  ) {
    const project = projects.find((item) => item.id === id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.version !== expectedVersion) {
      throw new Error("Project version conflict");
    }

    const updatedProject: Project = {
      ...project,
      status,
      updatedAt: new Date().toISOString(),
      version: project.version + 1,
    };

    Object.assign(project, updatedProject);

    activities.unshift({
      id: `activity-${id}-status-${updatedProject.version}`,
      projectId: id,
      type: "STATUS_CHANGED",
      message: `${project.name} status changed from ${project.status} to ${status}`,
      createdAt: updatedProject.updatedAt,
    });

    return updatedProject;
  },
};
