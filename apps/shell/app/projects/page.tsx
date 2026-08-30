import { ProjectListView } from "@/features/projects/components/project-list-view";
import { fixtureProjectDataSource } from "@/features/projects/data/fixture-project-data-source";
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

  const result = await fixtureProjectDataSource.list({
    query: filters.query || undefined,
    status: filters.status === "ALL" ? undefined : filters.status,
    sort: filters.sort,
    direction: filters.direction,
    first: 20,
    after: filters.after,
  });

  return (
    <ProjectListView
      projects={result.items}
      totalCount={result.totalCount}
      pageInfo={result.pageInfo}
      filters={filters}
    />
  );
}