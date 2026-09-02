export interface User {
  id: string;
  name: string;
}

export type ProjectStatus = "PLANNED" | "ACTIVE" | "PAUSED";

export type ProjectFilterStatus = "ALL" | ProjectStatus;

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: User;
  updatedAt: string;
  version: number;
}

export type ActivityType =
  | "STATUS_CHANGED"
  | "DEPLOYMENT_COMPLETED"
  | "DESCRIPTION_UPDATED"
  | "INCIDENT_CREATED";

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
}
