import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { DateTimeResolver } from "graphql-scalars";
import { createSchema, createYoga } from "graphql-yoga";

import { dashboardResolvers } from "./modules/dashboard/dashboard.resolvers.js";

type ProjectStatus = "PLANNED" | "ACTIVE" | "PAUSED";

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: { id: string; name: string };
  updatedAt: string;
  version: number;
};

type ProjectsServiceResponse = { projects: Project[] };

async function getProjectsFromService(): Promise<Project[]> {
  const serviceUrl = process.env.PROJECTS_SERVICE_URL ?? "http://localhost:4001";
  const response = await fetch(`${serviceUrl}/projects`);

  if (!response.ok) {
    throw new Error(`Projects service returned ${response.status}.`);
  }

  const payload = (await response.json()) as ProjectsServiceResponse;
  return payload.projects;
}

async function getProjects() {
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
}

function readSchemaFile(relativePath: string) {
  const builtFile = new URL(`./${relativePath}`, import.meta.url);
  const sourceFile = new URL(`../src/${relativePath}`, import.meta.url);

  return readFileSync(
    existsSync(fileURLToPath(builtFile)) ? builtFile : sourceFile,
    "utf8",
  );
}

const yoga = createYoga({
  graphqlEndpoint: "/graphql",
  healthCheckEndpoint: "/health",
  schema: createSchema({
    typeDefs: [
      readSchemaFile("transport/graphql/schema/project.graphql"),
      readSchemaFile("transport/graphql/schema/activity.graphql"),
      readSchemaFile("modules/dashboard/dashboard.graphql"),
    ],
    resolvers: {
      DateTime: DateTimeResolver,
      Query: {
        ...dashboardResolvers.Query,
        projects: getProjects,
      },
    },
  }),
});

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const server = createServer(yoga);

server.listen(port, () => {
  console.log(`GraphQL API listening on http://localhost:${port}/graphql`);
});
