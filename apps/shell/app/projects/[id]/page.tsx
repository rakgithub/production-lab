import { notFound } from "next/navigation";

import { getActivitiesByProjectId } from "@/features/activity/data/fixture-activity-data-source";
import {
  ProjectDetailView,
} from "@/features/projects";
import { fixtureProjectDataSource } from "@/features/projects/server";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await fixtureProjectDataSource.getById(id);

  if (!project) {
    notFound();
  }

  const activities = await getActivitiesByProjectId(id);

  return (
    <ProjectDetailView
      project={project}
      activities={activities}
    />
  );
}
