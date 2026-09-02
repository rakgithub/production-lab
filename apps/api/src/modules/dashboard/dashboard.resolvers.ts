import { getDashboardFromProjectsService } from "./projects-service.client.js";

export const dashboardResolvers = {
  Query: {
    dashboard: () => getDashboardFromProjectsService(),
  },
};
