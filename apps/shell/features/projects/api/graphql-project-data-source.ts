import "server-only";

import { executeGraphQL } from "@/lib/graphql/execute";
import { GetProjectsDocument } from "@/lib/graphql/generated/graphql";

import type {
  ProjectListInput,
  ProjectListResult,
} from "../model/project-repository";

export async function getProjects(
  input: ProjectListInput,
): Promise<ProjectListResult> {
  const data = await executeGraphQL(GetProjectsDocument, {
    filter:
      input.query || input.status
        ? {
            query: input.query,
            status: input.status,
          }
        : undefined,
    sort: {
      field: input.sort === "name" ? "NAME" : "UPDATED_AT",
      direction: input.direction === "asc" ? "ASC" : "DESC",
    },
    first: input.first,
    after: input.after,
  });

  return {
    items: data.projects.nodes,
    totalCount: data.projects.totalCount,
    pageInfo: {
      endCursor: data.projects.pageInfo.endCursor ?? null,
      hasNextPage: data.projects.pageInfo.hasNextPage,
    },
  };
}
