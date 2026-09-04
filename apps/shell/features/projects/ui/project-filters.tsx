"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui/components/button";

import { useProjectUrl } from "../lib/use-project-url";
import type { ProjectFilterStatus } from "../model/project";
import type { ProjectSearchParams } from "../lib/parse-project-search-params";
import { Input } from "@repo/ui";
import { ProjectSortSelect } from "./project-sort-select";

type ProjectFiltersProps = {
  filters: ProjectSearchParams;
};

export function ProjectFilters({ filters }: ProjectFiltersProps) {
  const [query, setQuery] = useState(filters.query);
  const [lastUrlQuery, setLastUrlQuery] = useState(filters.query);
  const { isPending, updateProjectUrl } = useProjectUrl();

  if (filters.query !== lastUrlQuery) {
    setLastUrlQuery(filters.query);
    setQuery(filters.query);
  }

  useEffect(() => {
    if (query === filters.query) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateProjectUrl({
        after: null,
        q: query.trim() || null,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.query, query, updateProjectUrl]);

  function changeStatus(status: ProjectFilterStatus) {
    updateProjectUrl({
      after: null,
      status: status === "ALL" ? null : status,
    });
  }

  function clearFilters() {
    setQuery("");
    updateProjectUrl({ after: null, q: null, status: null });
  }

  const hasFilters = filters.query.length > 0 || filters.status !== "ALL";

  return (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">Search projects</span>
        <Input
          aria-busy={isPending}
          className="rounded-md border border-slate-300 px-3 py-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by project name"
          type="search"
          value={query}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Status</span>
        <select
          className="rounded-md border border-slate-300 px-3 py-2"
          disabled={isPending}
          onChange={(event) =>
            changeStatus(event.target.value as ProjectFilterStatus)
          }
          value={filters.status}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PLANNED">Planned</option>
          <option value="PAUSED">Paused</option>
        </select>
      </label>
      <ProjectSortSelect
        direction={filters.direction}
        sort={filters.sort}
      />

      <Button
        className="self-end"
        disabled={isPending || !hasFilters}
        onClick={clearFilters}
        type="button"
        variant="outline"
      >
        Clear filters
      </Button>
    </div>
  );
}
