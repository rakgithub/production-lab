import {
  dashboardServiceResponseSchema,
  type DashboardServiceResponse,
} from "./dashboard-service.schema.js";

export async function getDashboardFromProjectsService(): Promise<DashboardServiceResponse> {
  const serviceUrl = process.env.PROJECTS_SERVICE_URL ?? "http://localhost:4001";
  const response = await fetch(`${serviceUrl}/dashboard`);

  if (!response.ok) {
    throw new Error(`Projects service returned ${response.status}.`);
  }

  return dashboardServiceResponseSchema.parse(await response.json());
}
