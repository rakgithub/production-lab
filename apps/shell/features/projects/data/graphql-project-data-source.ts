import "server-only";

import { executeGraphQL } from "@/lib/graphql/execute";
import { GetProjectsDocument } from "@/lib/graphql/generated/graphql";

import type { ProjectListResult } from "../project-data-source";

export async function getProjects(): Promise<ProjectListResult> {
  const data = await executeGraphQL(GetProjectsDocument);

  return {
    items: data.projects.nodes,
    totalCount: data.projects.totalCount,
    pageInfo: {
      endCursor: data.projects.pageInfo.endCursor ?? null,
      hasNextPage: data.projects.pageInfo.hasNextPage,
    },
  };
}
