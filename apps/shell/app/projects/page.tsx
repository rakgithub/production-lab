import {
  parseProjectSearchParams,
  ProjectListView,
} from "@/features/projects";
import { getProjects } from "@/features/projects/server";

type ProjectsPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const filters = parseProjectSearchParams(await searchParams);
  const result = await getProjects();

  return (
    <ProjectListView
      projects={result.items}
      totalCount={result.totalCount}
      pageInfo={result.pageInfo}
      filters={filters}
    />
  );
}
