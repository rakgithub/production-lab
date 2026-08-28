# AI Project Operations Dashboard — Technical Implementation Guide

## What this document is

This is the technical companion to [PROJECT_IMPLEMENTATION_PLAN.md](../PROJECT_IMPLEMENTATION_PLAN.md).

The project plan explains **what** to build and **why**. This document explains **how to build it** in this repository:

- exact routes and screen states;
- suggested file locations;
- data shapes and fixture scenarios;
- package and workspace commands;
- GraphQL schema and resolver boundaries;
- test cases and verification commands;
- the order in which to introduce real-time, AI, MCP, and voice.

Follow the stages in order. Do not install or implement a later-stage technology merely because it appears in this document.

## Conventions used in this guide

- Commands run from the repository root unless a command begins with `cd`.
- `shell` means `apps/shell`.
- `api` means `apps/api`.
- `ui` means `packages/ui`.
- `→` means “depends on” or “flows into”.
- Examples show target shapes, not files that already exist.
- Generated files are never edited manually.

---

# 1. Starting point and repository map

Current useful structure:

```text
production-lab/
├── apps/
│   ├── api/                 # Empty GraphQL-service workspace today
│   └── shell/               # Next.js App Router frontend
├── packages/
│   └── ui/                  # Shared React UI package
├── docs/
├── package.json             # Turbo root commands
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

The target architecture is:

```text
Browser
  │
  ▼
apps/shell (Next.js)
  │ GraphQL + assistant streaming HTTP
  ▼
apps/api (Node.js GraphQL BFF)
  │
  ├── seeded repository first
  └── backend-service adapters later
```

## Ownership rules

| Code belongs in | Examples | Do not put here |
| --- | --- | --- |
| `apps/shell` | routes, pages, React features, GraphQL operations, browser UI state | resolvers, backend secrets, direct backend-service credentials |
| `apps/api` | GraphQL schema, resolvers, project/activity services, AI orchestration, MCP tools | React pages or browser state |
| `packages/ui` | reusable Button, Badge, Dialog, Table, Skeleton | project fetching, route state, GraphQL operations |
| `apps/voice-agent` later | LiveKit agent process | duplicate Project/Activity service logic |

---

# 2. Stage 0 — Define the product contract before coding

## 2.1 Screens to implement

Implement four user-facing surfaces. Do not add more screens until these are complete.

| Route/surface | User purpose | Stage introduced |
| --- | --- | --- |
| `/` | Dashboard summary and entry point | Stage 2 |
| `/projects` | Find and browse projects | Stage 2 |
| `/projects/[id]` | Review one project and change its status | Stage 2 |
| Assistant panel on `/projects/[id]` | Ask project-scoped questions | Stage 6 |

## 2.2 Screen specifications

### `/` — Dashboard

Start small. It is not an admin dashboard.

```text
┌───────────────────────────────────────────────────────┐
│ AI Project Operations Dashboard                        │
│ Overview of active work                                │
│                                                       │
│ [ Total projects ] [ Active ] [ Planned ] [ Paused ]  │
│                                                       │
│ Recent activity                                        │
│ • Apollo status changed to Active                      │
│ • Orion deployment completed                           │
│                                                       │
│ [ View all projects ]                                  │
└───────────────────────────────────────────────────────┘
```

Initial data requirements:

- total project count;
- counts by status;
- five most recent activities;
- link to `/projects`.

### `/projects` — Project list

```text
┌─────────────────────────────────────────────────────────────────┐
│ Projects                                                        │
│ [ Search projects... ] [ Status: All ▼ ] [ Sort: Updated ▼ ]   │
│                                                                 │
│ Name             Status       Owner       Updated       Open    │
│ Apollo           Active       Sarah       2 minutes ago  →      │
│ Orion            Planned      Alex        Yesterday      →      │
│ ...                                                             │
│                                                                 │
│ 24 projects                         [ Previous ] [ 1 ] [ Next ]│
└─────────────────────────────────────────────────────────────────┘
```

Required URL parameters:

```text
/projects?q=apollo&status=ACTIVE&sort=updatedAt&direction=desc&page=1
```

Rules:

- `q`: optional trimmed search text;
- `status`: `ALL`, `PLANNED`, `ACTIVE`, or `PAUSED`;
- `sort`: `name` or `updatedAt`;
- `direction`: `asc` or `desc`;
- `page`: positive integer; default `1`;
- `pageSize`: not exposed initially; fixed to `20` on the server;
- invalid values fall back to defaults rather than crashing.

Required states:

| State | How to reach it | UI behavior |
| --- | --- | --- |
| Loading | Route is pending | Stable table-shaped skeleton; no layout jump |
| Success | Normal fixture/API response | Table, count, pagination |
| No projects exist | Empty repository | “No projects yet” and no active filter clear button |
| No matching projects | A filter/search finds zero results | “No projects match these filters” and a clear-filters action |
| Error | Repository/API throws | Clear message and retry action |

### `/projects/[id]` — Project detail

```text
┌───────────────────────────────────────────────────────────────┐
│ ← Projects                                                     │
│ Apollo                                                [ Ask AI ]│
│ Owner: Sarah                 Last updated: 2 minutes ago       │
│ Status: [ Active ▼ ]                                         │
│                                                               │
│ Recent activity                                               │
│ • Rakesh changed status from Planned to Active                │
│ • Deployment completed                                        │
│ • Description updated                                         │
└───────────────────────────────────────────────────────────────┘
```

Required states:

| State | UI behavior |
| --- | --- |
| Loading | Header/activity skeleton |
| Success | Project summary, status editor, activity feed, assistant trigger |
| Not found | Route-specific `not-found` state with link to `/projects` |
| Service failure | Error state with retry; do not show “not found” |
| No activity | Explain that no activity has been recorded yet |
| Mutation pending | Status control disabled; current/target state clear |
| Mutation error | Keep/reload authoritative status; show retryable accessible error |

### Assistant panel — Stage 6 onward

```text
┌──────────────────────────────────────────┐
│ AI Assistant                       [ × ]  │
│ Project: Apollo                        │
│                                          │
│ You: What changed today?                 │
│                                          │
│ Assistant: Apollo had three updates…     │
│ [ Tool: getRecentActivity — complete ]   │
│                                          │
│ [ Ask about this project...       ] [Send]│
│ [ Stop generating ]                      │
└──────────────────────────────────────────┘
```

It is not a global chatbot in its first version. Every question has an active `projectId`.

## 2.3 Minimal domain model

Create these types first. Do not add a database model yet.

```ts
export type ProjectStatus = "PLANNED" | "ACTIVE" | "PAUSED";

export type User = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: User;
  updatedAt: string;
};

export type ActivityType =
  | "STATUS_CHANGED"
  | "DEPLOYMENT_COMPLETED"
  | "DESCRIPTION_UPDATED"
  | "INCIDENT_CREATED";

export type Activity = {
  id: string;
  projectId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
};
```

Boundary rule: timestamps are ISO-8601 UTC strings, for example `2026-08-28T10:15:00.000Z`. Format them only in the UI.

---

# 3. Stage 1 — Make the workspace runnable and testable

Do this before feature work so every later stage can use the same commands.

## 3.1 Required root commands

The root scripts already use Turbo:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Turbo runs a task only in workspaces that implement that script.

## 3.2 Complete workspace scripts

### Shell

The shell should have these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Verify each command directly before relying on Turbo:

```bash
pnpm --filter shell lint
pnpm --filter shell typecheck
pnpm --filter shell test
pnpm --filter shell build
```

### UI package

The current UI package is a source-exported, just-in-time package. It needs quality scripts but does not need `dev`, `start`, or a compiled `build` script yet.

```json
{
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

The UI package must own tools it runs. If `eslint` is not available inside `packages/ui`, add it to that workspace rather than relying on another workspace’s dependency:

```bash
pnpm --filter @repo/ui add -D eslint
```

Then add an ESLint config for the UI package or extract a shared config only after more than one workspace has meaningful common rules.

### API

The API does not exist as runnable code yet. Until Stage 3, it should not advertise fake commands that always fail.

Remove the placeholder test script when starting this guide’s Stage 1 or replace it only after tests exist. In Stage 3, add:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:check": "pnpm codegen && git diff --exit-code -- src/generated"
  }
}
```

## 3.3 Install and use a reproducible dependency graph

After a dependency change:

```bash
pnpm install
git diff -- package.json apps packages pnpm-lock.yaml
```

Before opening a PR or testing CI behavior:

```bash
pnpm install --frozen-lockfile
```

This must succeed. It proves `pnpm-lock.yaml` agrees with every workspace `package.json`.

## 3.4 Environment file contract

Create examples before adding real secrets.

`apps/api/.env.example`:

```dotenv
API_PORT=4000
CORS_ORIGIN=http://localhost:3000
AI_PROVIDER=
AI_API_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

`apps/shell/.env.example`:

```dotenv
NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Implementation rules:

- Put actual values in `.env.local`/deployment secrets, never Git.
- Read `AI_API_KEY`, LiveKit secrets, and backend credentials only in `apps/api`.
- Browser values must use `NEXT_PUBLIC_` and must be safe for every visitor to see.
- Validate required variables at server startup; do not wait for the first user request.

## 3.5 Stage 1 verification

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git status --short
```

Do not continue until commands are either green or a known not-yet-implemented workspace is intentionally excluded from the corresponding Turbo task.

---

# 4. Stage 2 — Build the UI with typed fixtures

## 4.1 Target shell file structure

Create the following as the product UI starts. Route files stay in `app`; feature code stays outside routing.

```text
apps/shell/
├── app/
│   ├── page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       └── not-found.tsx
│   └── globals.css
├── features/
│   ├── projects/
│   │   ├── components/
│   │   ├── data/
│   │   ├── model.ts
│   │   ├── project-repository.ts
│   │   └── projects.test.ts
│   └── activity/
│       ├── components/
│       └── activity-repository.ts
└── lib/
    └── formatters/
```

Do not place all files in `app/`. Keeping feature logic near the feature makes the later GraphQL migration easier.

## 4.2 Create typed fixtures

Create `apps/shell/features/projects/model.ts` with the Stage 0 types. Then create one deterministic fixture module:

```text
apps/shell/features/projects/data/project-fixtures.ts
```

Use a fixed date, not `new Date()`, so snapshots, sort order, and test results remain stable.

Example fixture content:

```ts
import type { Activity, Project, User } from "../model";

export const users: User[] = [
  { id: "user-sarah", name: "Sarah" },
  { id: "user-alex", name: "Alex" },
];

export const projects: Project[] = [
  {
    id: "apollo",
    name: "Apollo",
    status: "ACTIVE",
    owner: users[0],
    updatedAt: "2026-08-28T10:15:00.000Z",
  },
  {
    id: "orion",
    name: "Orion",
    status: "PLANNED",
    owner: users[1],
    updatedAt: "2026-08-27T09:00:00.000Z",
  },
  {
    id: "nova",
    name: "Nova",
    status: "PAUSED",
    owner: users[0],
    updatedAt: "2026-08-20T08:00:00.000Z",
  },
];

export const activities: Activity[] = [
  {
    id: "activity-apollo-status-1",
    projectId: "apollo",
    type: "STATUS_CHANGED",
    message: "Rakesh changed status from Planned to Active",
    createdAt: "2026-08-28T10:15:00.000Z",
  },
  {
    id: "activity-apollo-deploy-1",
    projectId: "apollo",
    type: "DEPLOYMENT_COMPLETED",
    message: "Deployment completed",
    createdAt: "2026-08-28T09:30:00.000Z",
  },
];
```

Fixture scenarios to create deliberately:

| Scenario | Fixture/repository behavior | Used by |
| --- | --- | --- |
| Normal list | 3+ projects across statuses | `/projects` success state |
| Empty repository | `[]` before filtering | “No projects yet” state |
| No filter match | Normal list plus `q=does-not-exist` | “No matches” state |
| Project with no activity | Project exists, activity list is `[]` | Detail empty activity state |
| Not found | `getProject("unknown")` returns `null` | Route `not-found` state |
| Service error | Method throws `ProjectRepositoryError` | Route error state |
| Mutation failure | `updateStatus` rejects | Rollback/error UI |

## 4.3 Create a feature data interface

Do not import the arrays directly into React components. Create:

```text
apps/shell/features/projects/project-repository.ts
```

```ts
import type { Project, ProjectStatus } from "./model";

export type ProjectListInput = {
  query?: string;
  status?: ProjectStatus;
  sort: "name" | "updatedAt";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type ProjectListResult = {
  items: Project[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export interface ProjectRepository {
  list(input: ProjectListInput): Promise<ProjectListResult>;
  getById(id: string): Promise<Project | null>;
  updateStatus(id: string, status: ProjectStatus): Promise<Project>;
}
```

Then implement `fixture-project-repository.ts`. It should:

1. clone fixture data rather than mutate exported arrays;
2. filter by status/search;
3. sort deterministically;
4. slice the requested page;
5. throw predictable errors only in an explicit error fixture;
6. append a status-change activity when a status changes.

Later, the GraphQL client replaces this implementation. The UI component contract remains the same until the migration is complete.

## 4.4 Implement URL parsing once

Create:

```text
apps/shell/features/projects/project-search-params.ts
```

The function should accept Next’s search-param object and return valid defaults:

```ts
export type ProjectSearchParams = {
  query: string;
  status: "ALL" | "PLANNED" | "ACTIVE" | "PAUSED";
  sort: "name" | "updatedAt";
  direction: "asc" | "desc";
  page: number;
};

export function parseProjectSearchParams(
  params: Record<string, string | string[] | undefined>,
): ProjectSearchParams {
  // Trim q, validate every enum, parse page, and return defaults for invalid input.
}
```

Test this function before building controls. Test:

```text
empty params → defaults
page=2 → page 2
page=0 → page 1
page=not-a-number → page 1
status=ACTIVE → ACTIVE
status=UNKNOWN → ALL
q=%20apollo%20 → apollo
```

## 4.5 Implement the routes

### Root dashboard

Create `apps/shell/app/page.tsx` as a Server Component. It should fetch dashboard data from the fixture repository in Stage 2 and render:

- page heading;
- four status/count cards;
- recent activity list;
- Next.js `Link` to `/projects`.

Do not make the entire page a Client Component. Add client components only when an interaction requires them.

### Project list

Create `apps/shell/app/projects/page.tsx`:

1. await/parse `searchParams`;
2. call the repository with parsed input;
3. render `ProjectListPage` from the projects feature;
4. pass plain data and current filter values to client controls.

Add:

```text
apps/shell/app/projects/loading.tsx
apps/shell/app/projects/error.tsx
```

`loading.tsx` should use a table skeleton matching the final table’s width/rows.

`error.tsx` must be a Client Component because it needs a `reset()` action. It should explain the failure in user language and present a retry button.

### Project detail

Create `apps/shell/app/projects/[id]/page.tsx`:

1. await `params`;
2. call `getById(id)`;
3. call Next’s `notFound()` when the result is `null`;
4. fetch the activity list;
5. render summary, status editor, and activity feed.

Add `loading.tsx`, `error.tsx`, and `not-found.tsx` inside `[id]`.

## 4.6 Implement interactive controls

Create Client Components only for these leaves:

```text
ProjectFilters
ProjectSortSelect
ProjectPagination
ProjectStatusEditor
```

Use `useRouter`, `usePathname`, and `URLSearchParams` to update URL state. Keep the page as the data owner.

Recommended control behavior:

| Control | Behavior |
| --- | --- |
| Search | Debounce the URL replacement by 250–300ms; reset page to `1` |
| Status filter | Update URL immediately; reset page to `1` |
| Sort | Update sort/direction; reset page to `1` |
| Pagination | Use links/buttons with clear accessible labels; preserve other query parameters |
| Clear filters | Remove `q` and `status`; reset page to `1` |
| Status editor | Disable while pending; show success/error status; do not double-submit |

## 4.7 Stage 2 tests

Install any missing shell testing setup only when writing the first test. The project already has Vitest, React Testing Library, and `user-event` in the shell.

Test examples:

```text
project-search-params.test.ts
  - invalid values use defaults
  - valid values are preserved

project-list.test.tsx
  - renders projects
  - renders no-projects state
  - renders no-matches state
  - opens expected project link

project-status-editor.test.tsx
  - submits a new status
  - disables while pending
  - displays error and restores usable control on failure
```

Run:

```bash
pnpm --filter shell test
pnpm --filter shell typecheck
pnpm --filter shell build
```

Stage 2 is complete only when every required screen state can be shown without editing the component source.

---

# 5. Stage 3 — Build the GraphQL API and replace fixtures

## 5.1 Add API dependencies

From the root, add the runtime packages needed by the API:

```bash
pnpm --filter api add graphql graphql-yoga zod
```

Add development tooling:

```bash
pnpm --filter api add -D typescript tsx vitest @types/node eslint @eslint/js typescript-eslint
pnpm --filter api add -D @graphql-codegen/typescript @graphql-codegen/typescript-resolvers
```

Do not add a database package yet. The first API uses the same in-memory seed data pattern through a server-side repository.

## 5.2 Add API TypeScript configuration

Create `apps/api/tsconfig.json` for development/type checking and `apps/api/tsconfig.build.json` for emitted JavaScript.

Requirements:

- `strict: true`;
- `noUncheckedIndexedAccess: true`;
- `noImplicitOverride: true`;
- ESM output compatible with the package’s `"type": "module"`;
- output directory `dist` in the build config;
- `src/generated` included for codegen types.

## 5.3 Create API structure

```text
apps/api/
├── src/
│   ├── server.ts
│   ├── context.ts
│   ├── schema/
│   │   ├── project.graphql
│   │   ├── activity.graphql
│   │   ├── schema.ts
│   │   └── resolvers.ts
│   ├── modules/
│   │   ├── projects/
│   │   │   ├── project-service.ts
│   │   │   ├── project-repository.ts
│   │   │   └── in-memory-project-repository.ts
│   │   └── activity/
│   │       ├── activity-service.ts
│   │       └── in-memory-activity-repository.ts
│   ├── generated/             # code generation output; never edit manually
│   └── test/
├── codegen.ts
├── tsconfig.json
└── tsconfig.build.json
```

## 5.4 Write the first schema

Create `apps/api/src/schema/project.graphql`:

```graphql
enum ProjectStatus {
  PLANNED
  ACTIVE
  PAUSED
}

enum ProjectSortField {
  NAME
  UPDATED_AT
}

enum SortDirection {
  ASC
  DESC
}

type User {
  id: ID!
  name: String!
}

type Project {
  id: ID!
  name: String!
  status: ProjectStatus!
  owner: User!
  updatedAt: String!
}

type ProjectPage {
  items: [Project!]!
  totalCount: Int!
  page: Int!
  pageSize: Int!
}

input ProjectFilterInput {
  query: String
  status: ProjectStatus
}

input ProjectSortInput {
  field: ProjectSortField! = UPDATED_AT
  direction: SortDirection! = DESC
}

input UpdateProjectStatusInput {
  projectId: ID!
  status: ProjectStatus!
}

type UpdateProjectStatusPayload {
  project: Project!
  activity: Activity!
}

type Query {
  projects(
    filter: ProjectFilterInput
    sort: ProjectSortInput
    page: Int! = 1
    pageSize: Int! = 20
  ): ProjectPage!
  project(id: ID!): Project
}

type Mutation {
  updateProjectStatus(input: UpdateProjectStatusInput!): UpdateProjectStatusPayload!
}
```

Create `apps/api/src/schema/activity.graphql`:

```graphql
enum ActivityType {
  STATUS_CHANGED
  DEPLOYMENT_COMPLETED
  DESCRIPTION_UPDATED
  INCIDENT_CREATED
}

type Activity {
  id: ID!
  projectId: ID!
  type: ActivityType!
  message: String!
  createdAt: String!
}

extend type Query {
  recentActivity(projectId: ID!, limit: Int! = 20): [Activity!]!
}
```

Why offset/page pagination first:

- the screen has explicit page controls;
- the seeded dataset is small;
- it makes the UI simple to build;
- the service must enforce page-size limits and a stable secondary sort.

Revisit cursor pagination when data volume/realtime churn makes numbered pages unreliable.

## 5.5 Implement service boundaries

Resolvers must be thin. They translate GraphQL arguments into service calls.

```text
GraphQL resolver
  → ProjectService
    → ProjectRepository interface
      → InMemoryProjectRepository now
      → BackendServiceProjectRepository later
```

`ProjectService` responsibilities:

- validate/normalize list parameters;
- cap `pageSize` (for example, `1..100`);
- enforce authorization when authentication is introduced;
- coordinate status update and activity creation;
- expose domain errors such as not found or validation failure.

`ProjectRepository` responsibilities:

- retrieve/persist project records;
- no GraphQL types;
- no UI formatting;
- no HTTP request-specific logic.

Important mutation sequence:

```text
validate input
→ load project
→ reject nonexistent project
→ update status
→ create STATUS_CHANGED activity
→ return updated project + activity
```

When a database replaces the in-memory store, status update and activity creation must become one transaction.

## 5.6 Create GraphQL Yoga server

`src/server.ts` should:

1. build the schema once at startup;
2. create Yoga with a request context;
3. create a Node HTTP server;
4. listen on `API_PORT` (default `4000`);
5. provide a health/readiness endpoint;
6. close cleanly for `SIGINT` and `SIGTERM`.

Expected local endpoints:

```text
http://localhost:4000/health
http://localhost:4000/graphql
```

Start the API:

```bash
pnpm --filter api dev
```

Test it manually after implementation:

```bash
curl http://localhost:4000/health
```

```bash
curl http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"query { projects { totalCount items { id name status } } }"}'
```

## 5.7 Configure server code generation

Create `apps/api/codegen.ts` pointing at the SDL files and emitting resolver types into `src/generated`.

Conceptual configuration:

```ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/schema/**/*.graphql",
  generates: {
    "src/generated/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../context#GraphQLContext",
        useTypeImports: true,
      },
    },
  },
};

export default config;
```

Generate after every schema change:

```bash
pnpm --filter api codegen
pnpm --filter api typecheck
```

## 5.8 Add API tests

Test at two levels.

### Service tests

Use Vitest to test:

- filter and sort behavior;
- page-size limits;
- empty results;
- project not found;
- status update creates one activity;
- rejected update does not create activity.

### GraphQL integration tests

Call the Yoga fetch handler with GraphQL-over-HTTP requests. Test:

- successful `projects` query;
- invalid page/page size;
- unknown project;
- update mutation;
- error shape does not leak internal stack traces.

Run:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api build
```

## 5.9 Add client GraphQL dependencies and codegen

Add frontend GraphQL dependencies only when the API query exists:

```bash
pnpm --filter shell add @apollo/client @apollo/client-integration-nextjs graphql
pnpm --filter shell add -D @graphql-codegen/cli @graphql-codegen/client-preset
```

Create:

```text
apps/shell/
├── codegen.ts
├── lib/graphql/
│   ├── apollo-wrapper.tsx
│   ├── apollo-client.ts
│   └── generated/             # generated; never edit
└── features/projects/graphql/
    ├── project-list.graphql.ts
    ├── project-detail.graphql.ts
    └── update-project-status.graphql.ts
```

The shell Codegen configuration should:

- read schema SDL from `../../apps/api/src/schema/**/*.graphql` while working locally;
- scan shell GraphQL documents;
- emit client preset output to `lib/graphql/generated`;
- use type-only imports;
- fail CI when generated output is stale.

Example operation co-located with the feature:

```ts
import { graphql } from "@/lib/graphql/generated";

export const ProjectListQuery = graphql(/* GraphQL */ `
  query ProjectList($filter: ProjectFilterInput, $sort: ProjectSortInput, $page: Int!) {
    projects(filter: $filter, sort: $sort, page: $page) {
      totalCount
      page
      pageSize
      items {
        id
        name
        status
        updatedAt
        owner {
          id
          name
        }
      }
    }
  }
`);
```

Generate client types:

```bash
pnpm --filter shell codegen
pnpm --filter shell typecheck
```

## 5.10 Integrate Apollo into App Router deliberately

Create an `ApolloWrapper` Client Component using the official Next.js integration, then add it to the smallest suitable layout boundary.

Rules:

- use absolute API URLs when code runs server-side;
- choose whether a query is RSC-owned or Apollo-client-owned;
- do not fetch the same entity independently in both places without intentionally preloading/hydrating it;
- use Client Components for filters, optimistic mutation UI, and subscription-driven updates;
- keep API URL configuration in environment variables.

### Migration order

Replace fixture data in this order:

1. project list query;
2. project detail query;
3. activity query;
4. status mutation with optimistic UI;
5. dashboard summary query.

Keep fixture repositories only for component/unit tests and explicit offline/error scenarios after each production path is migrated.

## 5.11 Optimistic status mutation

Implement these steps in the status editor:

```text
User chooses a new status
→ validate that it differs from current status
→ update Apollo cache optimistically
→ disable duplicate submission
→ send updateProjectStatus mutation
→ replace optimistic entity with server response
→ append returned activity if not already present
→ on error: rollback/refetch and show error
```

Tests must prove:

- status changes immediately under simulated latency;
- duplicate submit cannot occur;
- failed mutation restores/refetches authoritative state;
- failure message is visible to screen readers.

---

# 6. Stage 4 — Build the shared design system from real screens

Do this after the project list/detail reveal repeated UI patterns.

## 6.1 First components to extract

| Component | First consumer | Required behavior |
| --- | --- | --- |
| `Button` | filters, retry, save, Ask AI | default, disabled, pending, keyboard focus |
| `Badge` | project status | semantic text label; color is never the only signal |
| `Skeleton` | list/detail loading | matches final geometry; `aria-hidden` where appropriate |
| `EmptyState` | empty project/activity list | heading, explanation, optional action |
| `ErrorState` | route/retry UI | understandable error, retry action |
| `Dialog` | status confirm or destructive action later | focus trap, Escape close, restore trigger focus |
| `Table` primitives | project list | semantic table markup; responsive strategy |

Recommended UI package structure:

```text
packages/ui/src/
├── button/
│   ├── button.tsx
│   ├── button.stories.tsx
│   └── button.test.tsx
├── badge/
├── empty-state/
├── error-state/
├── skeleton/
├── dialog/
└── index.ts
```

## 6.2 Component implementation rules

- Export only public components from `packages/ui/src/index.ts`.
- Use native HTML before ARIA: `<button>`, `<label>`, `<dialog>`/accessible dialog primitive, `<table>`, headings, lists.
- Use `forwardRef` only when consumers need it for focus/positioning.
- Do not put product terms such as `Project` or GraphQL data into UI package components.
- Keep visual variants constrained; avoid a single component with 30 unrelated props.

## 6.3 Stories and tests

For every extracted component, add a Storybook story demonstrating:

```text
default
disabled/pending if applicable
long content
narrow container
error or destructive variant where applicable
keyboard-relevant interaction
```

Run:

```bash
pnpm --filter @repo/ui storybook
pnpm --filter @repo/ui build-storybook
pnpm --filter @repo/ui test
```

## 6.4 Accessibility verification

Perform these manual checks on every new interactive component:

```text
Tab: reachable in expected order
Shift+Tab: reverse order works
Enter/Space: activates buttons
Escape: closes dialogs where expected
Focus: visibly indicated and not hidden
Screen reader: label, role, state, and errors are understandable
Zoom: 200% remains usable
Reduced motion: non-essential motion does not block use
```

---

# 7. Stage 5 — Add real-time activity safely

## 7.1 Add event fields and rules

Every activity event needs:

```ts
type Activity = {
  id: string;           // stable deduplication key
  projectId: string;
  type: ActivityType;
  message: string;
  createdAt: string;    // ordering input
};
```

Client merge rules:

1. If an event ID already exists, ignore it.
2. Otherwise insert it in descending `createdAt` order.
3. On reconnect, refetch the activity query before trusting new events.
4. When a user changes projects, unsubscribe from the old project before subscribing to the new one.

## 7.2 Implement polling first

Before subscriptions, implement a visible, testable polling baseline:

```text
Project detail opens
→ query recent activity
→ refresh every 30 seconds while the page is visible
→ merge by activity ID
→ stop on unmount/project change
```

Why: it proves refresh and merge behavior independently of streaming transport.

## 7.3 Add GraphQL subscription

Extend the schema only after polling is correct:

```graphql
type Subscription {
  activityAdded(projectId: ID!): Activity!
}
```

Add required client support:

```bash
pnpm --filter shell add graphql-sse
```

GraphQL Yoga supports GraphQL-over-SSE. Use a project-scoped subscription. The browser gets one-way updates; it does not need a full bidirectional WebSocket for this feature.

UI connection states:

```text
connected       → no visible noise, optionally “Live” label
reconnecting    → subtle “Reconnecting activity updates…” message
disconnected    → activity snapshot remains visible; retry happens in background
error           → show retry action; preserve last known data
```

## 7.4 Test scenarios

```text
same event arrives twice → one rendered row
events arrive reverse order → newest shown first
network disconnect → reconnect indicator appears
reconnect → authoritative query refetches
navigate Apollo → Orion → Apollo subscription does not leak across projects
component unmount → no active listener remains
```

Do not add Redis/Kafka until deploying more than one API process. At that point, replace in-memory pub/sub behind an `ActivityEventBus` interface.

---

# 8. Stage 6 — Text AI assistant

## 8.1 Decide the provider before installing an SDK

The project plan intentionally does not choose an LLM provider. Make an ADR before adding a provider SDK. The ADR must answer:

- Which provider/model is used?
- Where are credentials stored?
- What project data may be sent?
- How long are conversations retained?
- What limits control cost and abuse?
- What is the fallback when the provider is unavailable?

Do not put the provider key into `NEXT_PUBLIC_*` variables or browser code.

## 8.2 API module structure

```text
apps/api/src/modules/assistant/
├── assistant-service.ts
├── ai-provider.ts              # interface owned by this project
├── provider-<chosen-name>.ts   # one concrete provider implementation
├── assistant-policy.ts
├── assistant-stream-route.ts
└── assistant-service.test.ts
```

Use a small provider interface:

```ts
export type AssistantInput = {
  projectId: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
  signal: AbortSignal;
};

export interface AiProvider {
  stream(input: AssistantInput): AsyncIterable<string>;
}
```

The assistant service owns:

- allowed system instructions;
- project scope;
- provider call;
- token/input/output limit;
- abort propagation;
- log-safe request metadata;
- later tool-calling loop.

## 8.3 Streaming endpoint

Use a dedicated streaming HTTP endpoint in `apps/api`, not a GraphQL field, for incremental model text.

```text
POST /assistant/stream
```

Request body:

```json
{
  "projectId": "apollo",
  "message": "What changed today?",
  "conversation": []
}
```

Response protocol: choose Server-Sent Events or a newline-delimited streaming format and document it. Every event must have a type:

```text
message-start
text-delta
tool-start              # Stage 7
tool-result             # Stage 7
message-complete
error
```

Never stream raw provider errors directly to the browser.

## 8.4 Shell assistant structure

```text
apps/shell/features/assistant/
├── components/
│   ├── assistant-panel.tsx
│   ├── message-list.tsx
│   ├── assistant-composer.tsx
│   ├── assistant-status.tsx
│   └── tool-activity.tsx       # Stage 7
├── assistant-reducer.ts
├── assistant-stream-client.ts
├── assistant-types.ts
└── assistant.test.tsx
```

Use a reducer/state machine rather than one `isLoading` Boolean:

```text
idle
→ submitting
→ streaming
→ complete

submitting/streaming
→ cancelled

submitting/streaming
→ error
```

Required UI behavior:

- send button disabled for empty input;
- preserve user message immediately;
- show a meaningful loading status before the first token;
- append text deltas safely;
- expose `Stop generating` while streaming;
- use `AbortController` to cancel fetch;
- retain final conversation history for the current panel session;
- show retry without losing the user’s input.

Accessibility requirements:

- do not move focus on every streamed token;
- announce start/completion/error at useful intervals, not token-by-token;
- keep Stop and Close controls keyboard reachable;
- expose visible text transcript, never voice/audio only.

## 8.5 AI test cases

Use a fake `AiProvider` for service tests and a mock streaming endpoint for shell tests:

```text
first token arrives → UI begins rendering
completion → final message marked complete
user stops → abort reaches stream client and service
provider times out → safe error and retry UI
network stream breaks → safe error and preserved prompt
input exceeds limit → validation error before provider call
wrong project ID → no context/model request is made
```

---

# 9. Stage 7A — MCP tools

## 9.1 Tool boundary

MCP is the controlled layer through which the model obtains application data. It does not belong in browser code.

Initial read-only tool set:

| Tool | Input | Output |
| --- | --- | --- |
| `getProject` | `projectId` | one project summary |
| `searchProjects` | `query`, optional `limit` | matching project summaries |
| `getRecentActivity` | `projectId`, optional `limit` | ordered activity list |
| `getProjectMetrics` | `projectId` | small fixed metrics object |

Do not add `updateProjectStatus` as a tool initially. Any side-effecting tool needs confirmation, authorization, auditing, idempotency, and a clear undo story.

## 9.2 MCP module structure

```text
apps/api/src/mcp/
├── mcp-server.ts
├── tools/
│   ├── get-project.ts
│   ├── search-projects.ts
│   ├── get-recent-activity.ts
│   └── get-project-metrics.ts
├── mcp-auth.ts
└── mcp-server.test.ts
```

Install the current stable MCP server SDK at the time this stage starts. With the current SDK naming, the server package is:

```bash
pnpm --filter api add @modelcontextprotocol/server
```

Use a current Streamable HTTP transport for remote MCP access. Do not start a new integration on the legacy standalone HTTP+SSE transport.

## 9.3 Tool implementation rules

Every tool:

1. has an explicit Zod/JSON Schema input schema;
2. validates IDs and limits;
3. calls the same Project/Activity service used by GraphQL resolvers;
4. enforces the same authorization rules;
5. returns structured, bounded output;
6. emits a safe error result when downstream data is unavailable;
7. logs tool name, request ID, duration, outcome—not secrets/full sensitive data.

Never make the API call its own `/graphql` endpoint over HTTP merely to implement a tool. Call the service layer directly.

## 9.4 Assistant integration

The assistant server, not the browser, runs the tool-calling loop:

```text
User message
→ assistant service sends allowed tools to model
→ model requests getRecentActivity
→ assistant service validates/invokes MCP tool
→ tool calls ActivityService
→ result returns to model
→ model produces grounded response
→ shell receives text and visible tool activity
```

Show tool events in the panel:

```text
Looking up recent Apollo activity…
✓ Retrieved 3 activity events
```

## 9.5 MCP security checklist

- [ ] Tool endpoint requires appropriate authentication before public deployment.
- [ ] Token audience is validated for the MCP resource.
- [ ] Browser/API token is never passed through to a downstream service.
- [ ] Tool set can be filtered by user authorization.
- [ ] Input and result size are bounded.
- [ ] Tool invocation is visible to the user.
- [ ] Tool errors do not reveal credentials/internal topology.

---

# 10. Stage 7B — LiveKit voice assistant

## 10.1 Add voice only after text assistant passes

Do not implement voice until text assistant streaming, cancellation, errors, and MCP grounding work. Voice multiplies failure modes; it must reuse existing logic.

## 10.2 Process design

Create `apps/voice-agent` only when LiveKit needs a separately running agent process:

```text
apps/voice-agent/
├── src/
│   ├── agent.ts
│   ├── assistant-bridge.ts
│   └── agent.test.ts
├── package.json
└── tsconfig.json
```

The agent calls the same assistant/MCP/service policy. It does not own a second GraphQL schema or reimplement Project/Activity data access.

## 10.3 Token issuance flow

The browser must never receive `LIVEKIT_API_SECRET`.

```text
Shell voice button
→ POST to API token endpoint
→ API authenticates user and creates short-lived room token
→ browser connects to LiveKit with token
→ LiveKit agent joins the same room
```

API endpoint shape:

```text
POST /voice/token
{ "projectId": "apollo" }
```

The response contains only short-lived connection details safe for the browser.

## 10.4 Voice UI state machine

```text
idle
→ requesting-permission
→ connecting
→ listening
→ thinking
→ speaking

connecting/listening/thinking/speaking
→ reconnecting
→ error
→ idle
```

Create visible UI for every state. Required controls:

- Start voice conversation;
- Mute/unmute;
- Stop/disconnect;
- Retry after error;
- Continue by text.

Required cleanup:

- release microphone tracks on disconnect/unmount;
- unsubscribe from room events;
- cancel in-flight agent response on user interruption;
- avoid creating duplicate rooms/sessions on rapid clicks.

## 10.5 Voice acceptance tests

```text
Permission denied → clear recovery instructions and text fallback
Connected → visual listening state
User speaks while agent speaks → agent stops promptly
Network drop → reconnect state and recover/retry path
Navigate away → microphone track is stopped
Final assistant response → transcript is visible and retained
```

---

# 11. Stage 8 — Production hardening

## 11.1 CI gates

The CI workflow should run from a clean Linux runner:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Add later, after basic CI is stable:

```bash
pnpm --filter @repo/ui build-storybook
pnpm --filter shell codegen:check
pnpm --filter api codegen:check
pnpm test:e2e
```

## 11.2 End-to-end test scope

Add Playwright only when these flows exist:

```text
1. Open /projects, search/filter, open Apollo
2. Change project status; verify activity appears
3. Simulate mutation failure; verify rollback/error UI
4. Receive/reconnect live activity
5. Ask text assistant; observe streamed grounded response
6. Voice: permission, connect, interrupt, disconnect
```

Use user-visible locators:

```ts
page.getByRole("button", { name: "Save status" });
page.getByLabel("Search projects");
```

Avoid CSS selectors tied to styling implementation.

## 11.3 Observability fields

Introduce a request/correlation ID at the API boundary. Include it in structured logs for:

```text
HTTP request
GraphQL operation name
resolver/service duration
downstream backend call
assistant request
MCP tool invocation
LiveKit token issuance
```

Never log:

```text
authorization headers
API keys
LiveKit secrets
full browser tokens
unredacted sensitive prompts/tool results
```

## 11.4 GraphQL hardening before exposure

- enforce maximum page size;
- validate every input;
- add request/body/time limits;
- restrict CORS to known shell origins;
- mask internal errors;
- add query depth/cost limits;
- rate-limit by user/IP as appropriate;
- authorize both object lookup and collection edges;
- add persisted operations when the private API is production-facing.

## 11.5 Deployment compatibility rules

Because shell and API can deploy separately:

- add fields before consuming them;
- deploy API support before shell usage;
- stop using a field before removing it;
- do not change a field’s meaning/type in place;
- health-check both services;
- write a rollback path for each deployment.

---

# 12. Optional microfrontend migration

Do this only after the monolith is working and only as a measured exercise.

## 12.1 Decision test

Create an ADR before extraction. Answer yes to at least one:

- Do separate teams need separate releases?
- Does a route group need independent deployment/scaling?
- Is build/release coupling a measured problem?
- Is this explicitly a learning exercise with a rollback plan?

For this product, `/projects` and `/projects/[id]` should initially stay together because users navigate between them frequently. The assistant panel should also remain with project detail because it shares project context and UI state.

## 12.2 If extracting `/projects/*`

Target structure:

```text
apps/
├── shell/        # default zone and shell-owned routes
└── projects/     # owns /projects/* only
```

Implementation tasks:

1. Give each zone a unique path ownership rule.
2. Configure Next.js Multi-Zones rewrites from shell to projects app.
3. Give the non-default zone a unique asset prefix.
4. Use normal anchors, not Next `<Link>`, across zone boundaries.
5. Preserve auth/session/correlation ID through the boundary.
6. Add deep-link, refresh, error, and deployment tests.

Expect cross-zone navigation to be a hard navigation. If that harms the project-detail flow, revert the split.

---

# 13. Commands by implementation milestone

## Start local development

After the API exists:

```bash
pnpm dev
```

Expected processes:

```text
shell → http://localhost:3000
api   → http://localhost:4000
```

## Build feature-by-feature

```bash
# Shell route/component work
pnpm --filter shell dev
pnpm --filter shell test
pnpm --filter shell typecheck

# Shared component work
pnpm --filter @repo/ui storybook
pnpm --filter @repo/ui test
pnpm --filter @repo/ui build-storybook

# API work
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api codegen

# Full repository gate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Before opening a pull request

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
git status --short
```

Use [BRANCH_AND_PR_WORKFLOW.md](BRANCH_AND_PR_WORKFLOW.md) for branch, PR template, screenshot, ADR, and GitHub ruleset instructions.

---

# 14. Stage completion checklist

## Stage 2 complete

- [ ] Dashboard, project list, and project detail route exist.
- [ ] Fixtures show normal, loading, empty, no-match, not-found, and error states.
- [ ] URL owns project-list filter/sort/page state.
- [ ] Status editor has pending/error behavior.
- [ ] Feature/component tests pass.

## Stage 3 complete

- [ ] `apps/api` runs independently.
- [ ] GraphQL schema owns project/activity contract.
- [ ] Resolver/service/repository boundaries are present.
- [ ] Shell uses typed GraphQL operations for list/detail/mutation.
- [ ] API and client codegen checks pass.
- [ ] Optimistic status mutation rolls back safely.

## Stage 4 complete

- [ ] Shared components are extracted only from repeated product patterns.
- [ ] Stories document real states.
- [ ] Keyboard and accessibility checks are recorded.

## Stage 5 complete

- [ ] Activity is correct under duplicate, out-of-order, reconnect, and unmount scenarios.
- [ ] API scaling assumption is documented.

## Stage 6 complete

- [ ] Text assistant streams, cancels, retries, and fails safely.
- [ ] Provider key/context stay server-side.

## Stage 7 complete

- [ ] Read-only MCP tools are typed, authorized, visible, and tested.
- [ ] Voice reuses assistant policy/tools and handles permission/interruption/cleanup.

## Stage 8 complete

- [ ] CI, observability, security limits, and deployment runbook exist.
- [ ] Microfrontend decision is evidence-based, not automatic.
