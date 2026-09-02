"use client";

import { useRouter } from "next/navigation";

import { useProjectUrl } from "../lib/use-project-url";
import type { ProjectListResult } from "../model/project-repository";
import type { ProjectSearchParams } from "../lib/parse-project-search-params";

type ProjectPaginationProps = {
  filters: ProjectSearchParams;
  pageInfo: ProjectListResult["pageInfo"];
};

export function ProjectPagination({
  filters,
  pageInfo,
}: ProjectPaginationProps) {
  const router = useRouter();
  const { isPending, updateProjectUrl } = useProjectUrl();
  const hasPreviousPage = Boolean(filters.after);
  const hasNextPage = pageInfo.hasNextPage && Boolean(pageInfo.endCursor);

  function goToNextPage() {
    if (pageInfo.endCursor) {
      updateProjectUrl({ after: pageInfo.endCursor });
    }
  }

  return (
    <nav
      aria-label="Project pagination"
      className="flex items-center justify-between"
    >
      <button
        className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasPreviousPage || isPending}
        onClick={() => router.back()}
        type="button"
      >
        Previous
      </button>
      <button
        className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasNextPage || isPending}
        onClick={goToNextPage}
        type="button"
      >
        Next
      </button>
    </nav>
  );
}
