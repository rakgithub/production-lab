/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type ProjectStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'PLANNED';

export type GetProjectsQueryVariables = Exact<{ [key: string]: never; }>;


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

export const GetProjectsDocument = new TypedDocumentString(`
    query GetProjects {
  projects {
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