import { z } from "zod";

const activityTypes = [
  "STATUS_CHANGED",
  "DEPLOYMENT_COMPLETED",
  "DESCRIPTION_UPDATED",
  "INCIDENT_CREATED",
] as const;

export const dashboardServiceResponseSchema = z.object({
  counts: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    paused: z.number().int().nonnegative(),
  }),
  recentActivities: z.array(
    z.object({
      id: z.string(),
      projectId: z.string(),
      type: z.enum(activityTypes),
      message: z.string(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export type DashboardServiceResponse = z.infer<
  typeof dashboardServiceResponseSchema
>;
