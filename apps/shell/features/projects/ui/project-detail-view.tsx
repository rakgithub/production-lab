import Link from "next/link";
import { Card, CardContent } from "@repo/ui/components/card";

import type { Activity, Project } from "../model/project";
import { ProjectStatusEditor } from "./project-status-editor";
import { ProjectStatusBadge } from "./project-status-badge";

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

        <div className="flex items-center gap-2 text-muted-foreground">
          <ProjectStatusBadge status={project.status} />
          <span>Owned by {project.owner.name}</span>
        </div>
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
              <li key={activity.id}>
                <Card>
                  <CardContent>{activity.message}</CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
