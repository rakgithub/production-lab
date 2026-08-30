export interface User {
    id: string,
    name: string
}   

export interface Project {
    id: string,
    name: string,
    status: string,
    owner: User,
    updatedAt: string,
    version: number,
}

export type ActivityType =
  | "STATUS_CHANGED"
  | "DEPLOYMENT_COMPLETED"
  | "DESCRIPTION_UPDATED"
  | "INCIDENT_CREATED";

export interface Activity {
    id: string,
    projectId: string,
    type: ActivityType,
    message: string,
    createdAt: string,
}

export type ProjectStatus = "ALL" | "PLANNED" | "ACTIVE" | "PAUSED";

export type ProjectFilterStatus = "ALL" | ProjectStatus;