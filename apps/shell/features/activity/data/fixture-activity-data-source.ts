import { activities } from "@/features/projects/data/project-fixtures";

export async function getActivitiesByProjectId(
  projectId: string,
) {
  return activities
    .filter((activity) => activity.projectId === projectId)
    .sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
}