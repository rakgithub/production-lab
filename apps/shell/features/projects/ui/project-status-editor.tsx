"use client";

import { useState, useTransition } from "react";

import { updateFixtureProjectStatus } from "../api/actions/update-fixture-project-status";
import type { ProjectStatus } from "../model/project";

type ProjectStatusEditorProps = {
  initialStatus: ProjectStatus;
  initialVersion: number;
  projectId: string;
};

export function ProjectStatusEditor({
  initialStatus,
  initialVersion,
  projectId,
}: ProjectStatusEditorProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [version, setVersion] = useState(initialVersion);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveStatus() {
    if (selectedStatus === currentStatus || isPending) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await updateFixtureProjectStatus({
        expectedVersion: version,
        projectId,
        status: selectedStatus,
      });

      if (!result.ok) {
        setSelectedStatus(currentStatus);
        setMessage(result.message);
        return;
      }

      setCurrentStatus(result.project.status);
      setSelectedStatus(result.project.status);
      setVersion(result.project.version);
      setMessage(`Status changed to ${result.project.status}.`);
    });
  }

  return (
    <section aria-labelledby="project-status-heading" className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold" id="project-status-heading">
          Project status
        </h2>
        <p className="text-sm text-slate-600">
          Current status: {currentStatus}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">New status</span>
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            disabled={isPending}
            onChange={(event) =>
              setSelectedStatus(event.target.value as ProjectStatus)
            }
            value={selectedStatus}
          >
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </label>

        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || selectedStatus === currentStatus}
          onClick={saveStatus}
          type="button"
        >
          {isPending ? "Saving…" : "Save status"}
        </button>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm">
        {message}
      </p>
    </section>
  );
}
