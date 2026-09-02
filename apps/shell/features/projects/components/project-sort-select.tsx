"use client";

import { useProjectUrl } from "../hooks/use-project-url";
import type { ProjectSearchParams } from "../project-search-params";

type ProjectSortSelectProps = {
  direction: ProjectSearchParams["direction"];
  sort: ProjectSearchParams["sort"];
};

export function ProjectSortSelect({
  direction,
  sort,
}: ProjectSortSelectProps) {
  const { isPending, updateProjectUrl } = useProjectUrl();

  function changeSort(value: string) {
    const [nextSort, nextDirection] = value.split(":");

    updateProjectUrl({
      after: null,
      direction: nextDirection ?? "desc",
      sort: nextSort ?? "updatedAt",
    });
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">Sort projects</span>
      <select
        className="rounded-md border border-slate-300 px-3 py-2"
        disabled={isPending}
        onChange={(event) => changeSort(event.target.value)}
        value={`${sort}:${direction}`}
      >
        <option value="updatedAt:desc">Recently updated</option>
        <option value="updatedAt:asc">Least recently updated</option>
        <option value="name:asc">Name A–Z</option>
        <option value="name:desc">Name Z–A</option>
      </select>
    </label>
  );
}
