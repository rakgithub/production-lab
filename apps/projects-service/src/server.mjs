import { createServer } from "node:http";

const projects = [
  {
    id: "apollo",
    name: "Apollo",
    status: "ACTIVE",
    owner: { id: "user-sarah", name: "Sarah" },
    updatedAt: "2026-08-28T10:15:00.000Z",
    version: 3,
  },
  {
    id: "atlas",
    name: "Atlas",
    status: "PLANNED",
    owner: { id: "user-omar", name: "Omar" },
    updatedAt: "2026-08-27T14:30:00.000Z",
    version: 1,
  },
  {
    id: "beacon",
    name: "Beacon Rick",
    status: "PAUSED",
    owner: { id: "user-maya", name: "Maya" },
    updatedAt: "2026-08-26T09:00:00.000Z",
    version: 2,
  },
];

const port = Number(process.env.PROJECTS_SERVICE_PORT ?? 4001);

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (request.method === "GET" && request.url === "/projects") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ projects }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`Projects service listening on http://localhost:${port}`);
});
