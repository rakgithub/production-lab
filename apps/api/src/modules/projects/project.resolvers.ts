import { getProjectsFromService } from "./projects-service.client.js";

export const projectResolvers = {
  Query: {
    projects: async () => {
      const projects = await getProjectsFromService();

      return {
        nodes: projects,
        edges: projects.map((project) => ({
          cursor: project.id,
          node: project,
        })),
        totalCount: projects.length,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: projects[0]?.id ?? null,
          endCursor: projects.at(-1)?.id ?? null,
        },
      };
    },
  },
};
