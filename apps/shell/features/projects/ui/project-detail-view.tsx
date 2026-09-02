import Link from "next/link";

import type { Activity, Project } from "../model/project";
import { ProjectStatusEditor } from "./project-status-editor";

type ProjectDetailViewProps = {
  project: Project;
  activities: Activity[];
};

export function ProjectDetailView({
  project,
  activities,
}: ProjectDetailViewProps) {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <Link href="/projects" className="hover:underline">
        ← Projects
      </Link>

      <header>
        <h1 className="text-3xl font-semibold">{project.name}</h1>

        <p className="text-slate-600">
          {project.status} · Owned by {project.owner.name}
        </p>
      </header>

      <ProjectStatusEditor
        initialStatus={project.status}
        initialVersion={project.version}
        projectId={project.id}
      />

      <section>
        <h2 className="text-xl font-semibold">Recent activity</h2>

        {activities.length === 0 ? (
          <p>No activity has been recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded border border-slate-200 p-4"
              >
                {activity.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
