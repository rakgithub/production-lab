import type { Project, ProjectStatus } from "./project";

export type ProjectListInput = {
  query?: string;
  status?: ProjectStatus;
  sort: "name" | "updatedAt";
  direction: "asc" | "desc";
  first: number;
  after?: string;
};

export type ProjectListResult = {
  items: Project[];
  totalCount: number;
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
};

export interface ProjectDataSource {
  list(input: ProjectListInput): Promise<ProjectListResult>;

  getById(id: string): Promise<Project | null>;

  updateStatus(
    id: string,
    status: ProjectStatus,
    expectedVersion: number,
  ): Promise<Project>;
}
