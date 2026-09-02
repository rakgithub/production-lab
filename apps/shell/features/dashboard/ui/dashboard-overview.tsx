import Link from "next/link";

import type { Dashboard } from "../api/graphql-dashboard-data-source";

type DashboardOverviewProps = {
  dashboard: Dashboard;
};

export default function DashboardOverview({
  dashboard,
}: DashboardOverviewProps) {

  const cards = [
    { label: "Total projects", value: dashboard.counts.total },
    { label: "Active", value: dashboard.counts.active },
    { label: "Planned", value: dashboard.counts.planned },
    { label: "Paused", value: dashboard.counts.paused },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold">
          AI Project Operations Dashboard
        </h1>

        <p className="text-slate-600">
          Overview of active project work.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-slate-200 p-5"
          >
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Recent activity</h2>

        <ul className="mt-4 space-y-3">
          {dashboard.recentActivities.map((activity) => (
            <li
              key={activity.id}
              className="rounded border border-slate-200 p-4"
            >
              {activity.message}
            </li>
          ))}
        </ul>
      </section>

      <Link href="/projects" className="underline">
        View all projects
      </Link>
    </main>
  );
}
