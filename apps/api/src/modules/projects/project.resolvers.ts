import { getProjectsFromService } from "./projects-service.client.js";

type ProjectsArgs = {
  filter?: {
    query?: string | null;
    status?: string | null;
  } | null;
  sort?: {
    field: "NAME" | "UPDATED_AT";
    direction: "ASC" | "DESC";
  } | null;
  first?: number | null;
  after?: string | null;
};

export const projectResolvers = {
  Query: {
    projects: async (_parent: unknown, args: ProjectsArgs) => {
      let projects = await getProjectsFromService();

      if (args.filter?.query) {
        const query = args.filter.query.toLocaleLowerCase();

        projects = projects.filter((project) =>
          project.name.toLocaleLowerCase().includes(query),
        );
      }

      if (args.filter?.status) {
        const status = args.filter.status;
        projects = projects.filter((project) => project.status === status);
      }

      const sortField = args.sort?.field ?? "UPDATED_AT";
      const direction = args.sort?.direction ?? "DESC";

      projects.sort((left, right) => {
        const leftValue =
          sortField === "NAME" ? left.name : left.updatedAt;
        const rightValue =
          sortField === "NAME" ? right.name : right.updatedAt;
        const comparison = leftValue.localeCompare(rightValue);

        if (comparison !== 0) {
          return direction === "ASC" ? comparison : -comparison;
        }

        return left.id.localeCompare(right.id);
      });

      const startIndex = args.after
        ? projects.findIndex((project) => project.id === args.after) + 1
        : 0;
      const safeStartIndex = Math.max(startIndex, 0);
      const first = Math.max(args.first ?? 20, 0);
      const nodes = projects.slice(safeStartIndex, safeStartIndex + first);
      const hasNextPage = safeStartIndex + nodes.length < projects.length;

      return {
        nodes,
        edges: nodes.map((project) => ({
          cursor: project.id,
          node: project,
        })),
        totalCount: projects.length,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: safeStartIndex > 0,
          startCursor: nodes[0]?.id ?? null,
          endCursor: hasNextPage ? (nodes.at(-1)?.id ?? null) : null,
        },
      };
    },
  },
};
