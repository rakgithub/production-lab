import "server-only";

import type { TypedDocumentString } from "./generated/graphql";

type GraphQLError = {
  message: string;
};

type GraphQLResponse<TResult> = {
  data?: TResult;
  errors?: GraphQLError[];
};

export async function executeGraphQL<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never>
    ? []
    : [variables: TVariables]
): Promise<TResult> {
  const response = await fetch(
    process.env.API_URL ?? "http://localhost:4000/graphql",
    {
      method: "POST",
      headers: {
        accept: "application/graphql-response+json, application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: document.toString(),
        variables: variables ?? undefined,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`GraphQL request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as GraphQLResponse<TResult>;

  if (payload.errors?.length) {
    throw new Error(
      `GraphQL request failed: ${payload.errors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }

  if (!payload.data) {
    throw new Error("GraphQL response did not include data.");
  }

  return payload.data;
}
