import "server-only";

import { executeGraphQL } from "@/lib/graphql/execute";
import {
  GetDashboardDocument,
  type GetDashboardQuery,
} from "@/lib/graphql/generated/graphql";

export type Dashboard = GetDashboardQuery["dashboard"];

export async function getDashboard(): Promise<Dashboard> {
  const data = await executeGraphQL(GetDashboardDocument);

  return data.dashboard;
}
