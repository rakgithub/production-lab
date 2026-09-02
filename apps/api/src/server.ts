import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { DateTimeResolver } from "graphql-scalars";
import { createSchema, createYoga } from "graphql-yoga";

import { dashboardResolvers } from "./modules/dashboard/dashboard.resolvers.js";
import { projectResolvers } from "./modules/projects/project.resolvers.js";

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
        ...projectResolvers.Query,
      },
    },
  }),
});

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const server = createServer(yoga);

server.listen(port, () => {
  console.log(`GraphQL API listening on http://localhost:${port}/graphql`);
});
