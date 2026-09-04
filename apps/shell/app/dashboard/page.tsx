import { getDashboard } from "@/features/dashboard/api/graphql-dashboard-data-source";
import DashboardOverview from "@/features/dashboard/ui/dashboard-overview";

export default async function Dashboard() {

    const dashboard = await getDashboard();

    return <DashboardOverview dashboard={dashboard} />;
}