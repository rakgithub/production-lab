import {
  projectsServiceResponseSchema,
  type Project,
} from "./project-service.schema.js";

export async function getProjectsFromService(): Promise<Project[]> {
  const serviceUrl = process.env.PROJECTS_SERVICE_URL ?? "http://localhost:4001";
  const response = await fetch(`${serviceUrl}/projects`);

  if (!response.ok) {
    throw new Error(`Projects service returned ${response.status}.`);
  }

  const payload = projectsServiceResponseSchema.parse(await response.json());

  return payload.projects;
}
