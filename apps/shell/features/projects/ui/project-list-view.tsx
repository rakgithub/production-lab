import Link from "next/link";
import { Card, CardContent } from "@repo/ui/components/card";

import type { Project } from "../model/project";
import type { ProjectListResult } from "../model/project-repository";
import type { ProjectSearchParams } from "../lib/parse-project-search-params";
import { ProjectFilters } from "./project-filters";
import { ProjectPagination } from "./project-pagination";
import { ProjectSortSelect } from "./project-sort-select";
import { ProjectStatusBadge } from "./project-status-badge";

type ProjectListViewProps = {
  projects: Project[];
  totalCount: number;
  pageInfo: ProjectListResult["pageInfo"];
  filters: ProjectSearchParams;
};

export function ProjectListView({
  projects,
  totalCount,
  pageInfo,
  filters,
}: ProjectListViewProps) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold">Projects</h1>
        <p className="text-slate-600">
          {totalCount} projects found
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <ProjectFilters filters={filters} key={filters.query} />
        <ProjectSortSelect
          direction={filters.direction}
          sort={filters.sort}
        />
      </div>

      {projects.length === 0 ? (
        <p>No projects match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>

                    <p className="text-sm text-muted-foreground">
                      Owned by {project.owner.name}
                    </p>
                  </div>

                  <ProjectStatusBadge status={project.status} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ProjectPagination filters={filters} pageInfo={pageInfo} />
    </main>
  );
}
