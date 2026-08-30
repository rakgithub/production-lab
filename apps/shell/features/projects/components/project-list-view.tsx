import Link from "next/link";

import type { Project } from "../model";
import type { ProjectListResult } from "../project-data-source";
import type { ProjectSearchParams } from "../project-search-params";

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

      <p className="text-sm text-slate-600">
        Search: {filters.query || "None"} · Status: {filters.status}
      </p>

      {projects.length === 0 ? (
        <p>No projects match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <Link
                href={`/projects/${project.id}`}
                className="font-medium hover:underline"
              >
                {project.name}
              </Link>

              <p className="text-sm text-slate-600">
                {project.status} · {project.owner.name}
              </p>
            </li>
          ))}
        </ul>
      )}

      {pageInfo.hasNextPage && pageInfo.endCursor ? (
        <Link
          href={`/projects?after=${encodeURIComponent(
            pageInfo.endCursor,
          )}`}
        >
          Next
        </Link>
      ) : null}
    </main>
  );
}