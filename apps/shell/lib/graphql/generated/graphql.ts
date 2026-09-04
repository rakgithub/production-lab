/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type ActivityType =
  | 'DEPLOYMENT_COMPLETED'
  | 'DESCRIPTION_UPDATED'
  | 'INCIDENT_CREATED'
  | 'STATUS_CHANGED';

export type ProjectFilterInput = {
  query?: string | null | undefined;
  status?: ProjectStatus | null | undefined;
};

export type ProjectSortField =
  | 'NAME'
  | 'UPDATED_AT';

export type ProjectSortInput = {
  direction?: SortDirection;
  field?: ProjectSortField;
};

export type ProjectStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'PLANNED';

export type SortDirection =
  | 'ASC'
  | 'DESC';

export type GetDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardQuery = { dashboard: { counts: { total: number, active: number, planned: number, paused: number }, recentActivities: Array<{ id: string, projectId: string, type: ActivityType, message: string, createdAt: string }> } };

export type GetProjectsQueryVariables = Exact<{
  filter?: ProjectFilterInput | null | undefined;
  sort?: ProjectSortInput | null | undefined;
  first: number;
  after?: string | null | undefined;
}>;


export type GetProjectsQuery = { projects: { totalCount: number, nodes: Array<{ id: string, name: string, status: ProjectStatus, updatedAt: string, version: number, owner: { id: string, name: string } }>, pageInfo: { endCursor: string | null, hasNextPage: boolean } } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const GetDashboardDocument = new TypedDocumentString(`
    query GetDashboard {
  dashboard {
    counts {
      total
      active
      planned
      paused
    }
    recentActivities {
      id
      projectId
      type
      message
      createdAt
    }
  }
}
    `) as unknown as TypedDocumentString<GetDashboardQuery, GetDashboardQueryVariables>;
export const GetProjectsDocument = new TypedDocumentString(`
    query GetProjects($filter: ProjectFilterInput, $sort: ProjectSortInput, $first: Int!, $after: String) {
  projects(filter: $filter, sort: $sort, first: $first, after: $after) {
    totalCount
    nodes {
      id
      name
      status
      owner {
        id
        name
      }
      updatedAt
      version
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
    `) as unknown as TypedDocumentString<GetProjectsQuery, GetProjectsQueryVariables>;