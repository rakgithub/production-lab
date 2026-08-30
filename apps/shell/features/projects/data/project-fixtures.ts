import { Activity, Project, User } from "../model";

// export const users: User[] = [
//   { id: "user-sarah", name: "Sarah" },
//   { id: "user-alex", name: "Alex" },
// ];

const sarah: User = {
  id: "user-sarah",
  name: "Sarah",
};

const alex: User = {
  id: "user-alex",
  name: "Alex",
};

export const users: User[] = [sarah, alex];

export const projects: Project[] = [
  {
    id: "apollo",
    name: "Apollo",
    status: "ACTIVE",
    owner: sarah,
    updatedAt: "2026-08-28T10:15:00.000Z",
    version: 3,
  },
  {
    id: "orion",
    name: "Orion",
    status: "PLANNED",
    owner: alex,
    updatedAt: "2026-08-27T09:00:00.000Z",
    version: 1,
  },
  {
    id: "nova",
    name: "Nova",
    status: "PAUSED",
    owner: sarah,
    updatedAt: "2026-08-20T08:00:00.000Z",
    version: 2,
  },
];

export const activities: Activity[] = [
  {
    id: "activity-apollo-status-1",
    projectId: "apollo",
    type: "STATUS_CHANGED",
    message: "Rakesh changed status from Planned to Active",
    createdAt: "2026-08-28T10:15:00.000Z",
  },
  {
    id: "activity-apollo-deploy-1",
    projectId: "apollo",
    type: "DEPLOYMENT_COMPLETED",
    message: "Deployment completed",
    createdAt: "2026-08-28T09:30:00.000Z",
  },
];