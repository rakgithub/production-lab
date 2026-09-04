import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Project } from "../src/modules/projects/project-service.schema.js";
import { projectResolvers } from "../src/modules/projects/project.resolvers.js";

const { getProjectsFromService } = vi.hoisted(() => ({
  getProjectsFromService: vi.fn(),
}));

vi.mock("../src/modules/projects/projects-service.client.js", () => ({
  getProjectsFromService,
}));

const projects = [
  {
    id: "apollo",
    name: "Apollo",
    status: "ACTIVE",
    owner: { id: "user-1", name: "Sarah" },
    updatedAt: "2026-09-03T10:00:00.000Z",
    version: 1,
  },
  {
    id: "atlas",
    name: "Atlas",
    status: "PLANNED",
    owner: { id: "user-2", name: "Alex" },
    updatedAt: "2026-09-04T10:00:00.000Z",
    version: 1,
  },
  {
    id: "beacon",
    name: "Beacon",
    status: "ACTIVE",
    owner: { id: "user-1", name: "Sarah" },
    updatedAt: "2026-09-02T10:00:00.000Z",
    version: 1,
  },
] satisfies Project[];

describe("projectResolvers.Query.projects", () => {
  beforeEach(() => {
    getProjectsFromService.mockReset();
    getProjectsFromService.mockResolvedValue(projects);
  });

  it("filters projects and returns sorted cursor pagination", async () => {
    const filtered = await projectResolvers.Query.projects(undefined, {
      filter: { query: "AP", status: "ACTIVE" },
      first: 20,
    });

    expect(filtered.totalCount).toBe(1);
    expect(filtered.nodes.map((project) => project.id)).toEqual(["apollo"]);

    const firstPage = await projectResolvers.Query.projects(undefined, {
      sort: { field: "NAME", direction: "ASC" },
      first: 2,
    });

    expect(firstPage.nodes.map((project) => project.name)).toEqual([
      "Apollo",
      "Atlas",
    ]);
    expect(firstPage.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "apollo",
      endCursor: "atlas",
    });
  });
});
