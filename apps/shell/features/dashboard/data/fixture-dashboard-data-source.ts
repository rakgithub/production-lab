import {
  activities,
  projects,
} from "@/features/projects/data/project-fixtures";

export async function getFixtureDashboardData() {
  return {
    counts: {
      total: projects.length,
      active: projects.filter(
        (project) => project.status === "ACTIVE",
      ).length,
      planned: projects.filter(
        (project) => project.status === "PLANNED",
      ).length,
      paused: projects.filter(
        (project) => project.status === "PAUSED",
      ).length,
    },
    recentActivities: [...activities]
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .slice(0, 5),
  };
}