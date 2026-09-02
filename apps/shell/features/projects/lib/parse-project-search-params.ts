import type { ProjectFilterStatus } from "../model/project";

export type ProjectSearchParams = {
  query: string;
  status: ProjectFilterStatus;
  sort: "name" | "updatedAt";
  direction: "asc" | "desc";
  after?: string;
};

type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseProjectSearchParams(
  params: RawSearchParams,
): ProjectSearchParams {
  const query = getSingleValue(params.q)?.trim() ?? "";
  const rawStatus = getSingleValue(params.status);
  const rawSort = getSingleValue(params.sort);
  const rawDirection = getSingleValue(params.direction);
  const rawAfter = getSingleValue(params.after);

  const statuses: ProjectFilterStatus[] = [
    "ALL",
    "PLANNED",
    "ACTIVE",
    "PAUSED",
  ];

  const status: ProjectFilterStatus =
    rawStatus && statuses.includes(rawStatus as ProjectFilterStatus)
      ? (rawStatus as ProjectFilterStatus)
      : "ALL";

  const sort =
    rawSort === "name" || rawSort === "updatedAt"
      ? rawSort
      : "updatedAt";

  const direction =
    rawDirection === "asc" || rawDirection === "desc"
      ? rawDirection
      : "desc";

  const after =
    rawAfter &&
    rawAfter.length <= 200 &&
    !/[\u0000-\u001F\u007F]/.test(rawAfter)
      ? rawAfter
      : undefined;

  return {
    query,
    status,
    sort,
    direction,
    ...(after ? { after } : {}),
  };
}
