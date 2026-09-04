import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Dashboard } from "../api/graphql-dashboard-data-source";
import DashboardOverview from "./dashboard-overview";

const dashboard: Dashboard = {
  counts: {
    total: 12,
    active: 6,
    planned: 4,
    paused: 2,
  },
  recentActivities: [
    {
      id: "activity-1",
      projectId: "project-1",
      type: "STATUS_CHANGED",
      message: "Atlas moved from planned to active",
      createdAt: "2026-09-04T08:00:00.000Z",
    },
    {
      id: "activity-2",
      projectId: "project-2",
      type: "DEPLOYMENT_COMPLETED",
      message: "Apollo deployment completed",
      createdAt: "2026-09-04T07:00:00.000Z",
    },
  ],
};

describe("DashboardOverview", () => {
  it("shows project totals, recent activity, and navigation", () => {
    render(<DashboardOverview dashboard={dashboard} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "AI Project Operations Dashboard",
      }),
    ).toBeInTheDocument();

    const expectedCounts: Array<[string, string]> = [
      ["Total projects", "12"],
      ["Active", "6"],
      ["Planned", "4"],
      ["Paused", "2"],
    ];

    for (const [label, value] of expectedCounts) {
      const card = screen.getByText(label).parentElement;

      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
    }

    expect(
      screen.getByText("Atlas moved from planned to active"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Apollo deployment completed"),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Add users" })).toHaveAttribute(
      "href",
      "/users",
    );
    expect(
      screen.getByRole("button", { name: "View all projects" }),
    ).toHaveAttribute("href", "/projects");
  });
});
