/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query GetDashboard {\n  dashboard {\n    counts {\n      total\n      active\n      planned\n      paused\n    }\n    recentActivities {\n      id\n      projectId\n      type\n      message\n      createdAt\n    }\n  }\n}": typeof types.GetDashboardDocument,
    "query GetProjects($filter: ProjectFilterInput, $sort: ProjectSortInput, $first: Int!, $after: String) {\n  projects(filter: $filter, sort: $sort, first: $first, after: $after) {\n    totalCount\n    nodes {\n      id\n      name\n      status\n      owner {\n        id\n        name\n      }\n      updatedAt\n      version\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}": typeof types.GetProjectsDocument,
};
const documents: Documents = {
    "query GetDashboard {\n  dashboard {\n    counts {\n      total\n      active\n      planned\n      paused\n    }\n    recentActivities {\n      id\n      projectId\n      type\n      message\n      createdAt\n    }\n  }\n}": types.GetDashboardDocument,
    "query GetProjects($filter: ProjectFilterInput, $sort: ProjectSortInput, $first: Int!, $after: String) {\n  projects(filter: $filter, sort: $sort, first: $first, after: $after) {\n    totalCount\n    nodes {\n      id\n      name\n      status\n      owner {\n        id\n        name\n      }\n      updatedAt\n      version\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}": types.GetProjectsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetDashboard {\n  dashboard {\n    counts {\n      total\n      active\n      planned\n      paused\n    }\n    recentActivities {\n      id\n      projectId\n      type\n      message\n      createdAt\n    }\n  }\n}"): typeof import('./graphql').GetDashboardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetProjects($filter: ProjectFilterInput, $sort: ProjectSortInput, $first: Int!, $after: String) {\n  projects(filter: $filter, sort: $sort, first: $first, after: $after) {\n    totalCount\n    nodes {\n      id\n      name\n      status\n      owner {\n        id\n        name\n      }\n      updatedAt\n      version\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}"): typeof import('./graphql').GetProjectsDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
