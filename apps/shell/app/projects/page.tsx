import { ProjectListView } from "@/features/projects/components/project-list-view";
import { getProjects } from "@/features/projects/data/graphql-project-data-source";
import { parseProjectSearchParams } from "@/features/projects/project-search-params";

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
