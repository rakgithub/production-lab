import { z } from "zod";

export type ProjectStatus = "PLANNED" | "ACTIVE" | "PAUSED";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: { id: string; name: string };
  updatedAt: string;
  version: number;
};

export const projectSchema: z.ZodType<Project> = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["PLANNED", "ACTIVE", "PAUSED"]),
  owner: z.object({
    id: z.string(),
    name: z.string(),
  }),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export const projectsServiceResponseSchema = z.object({
  projects: z.array(projectSchema),
});

export type ProjectsServiceResponse = z.infer<
  typeof projectsServiceResponseSchema
>;
