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

## Enterprise architecture position

Start with a **modular monolith inside each deployable application**. `apps/shell` and `apps/api` are separate deployables because they have different runtime responsibilities, but neither should be split into more services until team ownership, scaling, security, or release data proves that a split is useful.

Use this dependency direction inside the API:

```text
transport (GraphQL/HTTP)
  → application use cases
    → domain rules and ports
      ← infrastructure adapters (backend HTTP clients, database, event transport)
```

The composition root connects those layers at startup. Domain and application modules must not import GraphQL resolver types, Yoga, database clients, or backend-service SDKs. This keeps business behavior testable and allows an in-memory adapter to be replaced without rewriting resolvers.

Architectural rules:

- organize by business capability (`projects`, `activity`, `assistant`), then by layer inside the capability;
- keep cross-feature imports explicit and one-directional; enforce them with ESLint import rules when the module count grows;
- do not create a generic `shared`, `common`, or `utils` package as a dumping ground;
- do not import runtime code between `apps/shell` and `apps/api`; they communicate through the GraphQL/HTTP contract only;
- keep tenant, actor, authorization, request ID, and trace context available at the application boundary, even if the first local version uses a development actor;
- record consequential architecture choices as ADRs, including API separation, authentication/session model, persistence, subscriptions, AI provider, and any microfrontend split.

Because this API is a BFF over backend services, define source-of-truth ownership explicitly:

- the backend service that owns Project data also owns authoritative project invariants, persistence transactions, version checks, and durable audit/event creation;
- the GraphQL BFF owns the client-oriented schema, aggregation, input/response mapping, request authorization orchestration, deadlines, and safe error translation;
- the BFF may apply presentation/workflow policy, but must not copy the same authoritative business rule into a second writable datastore;
- a BFF cache or read model is disposable and never becomes an accidental system of record;
- if no downstream Project service exists yet, the in-memory repository is a temporary local implementation. Before adding a database to `apps/api`, make an ADR that deliberately assigns Project ownership to this service.

Enterprise quality is expressed through measurable behavior, not extra layers:

| Quality | Initial requirement |
| --- | --- |
| Security | deny by default; validate input; authorize in application/domain policy; never expose secrets or internal errors |
| Availability | liveness/readiness probes, graceful shutdown, bounded downstream timeouts, rollback plan |
| Data integrity | atomic mutations, optimistic concurrency, idempotency where retries are possible, audit records |
| Evolvability | additive GraphQL changes, generated contract artifact, schema-diff CI gate |
| Operability | structured logs, traces, metrics, correlation IDs, documented SLOs and alerts |
| Performance | bounded pagination, request-scoped batching, measured query-cost limits, load tests for critical paths |

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
│ 24 projects                              [ Previous ] [ Next ]│
└─────────────────────────────────────────────────────────────────┘
```

Required URL parameters:

```text
/projects?q=apollo&status=ACTIVE&sort=updatedAt&direction=desc&after=opaqueCursor
```

Rules:

- `q`: optional trimmed search text;
- `status`: `ALL`, `PLANNED`, `ACTIVE`, or `PAUSED`;
- `sort`: `name` or `updatedAt`;
- `direction`: `asc` or `desc`;
- `after`: optional opaque cursor returned by the API; clients must never decode or construct it;
- `first`: not exposed initially; fixed to `20` by the shell and capped by the API;
- invalid values fall back to defaults rather than crashing.

Use cursor pagination from the first API contract. It avoids much of the duplicate/skip drift caused by numbered offsets when records are inserted. The first UI only needs Previous/Next: Next places `endCursor` in the URL and browser history provides the previous location. Add bidirectional `before`/`last` navigation only when the product needs direct backward cursor queries. A mutable sort field such as `updatedAt` can still move records between windows; after a status mutation, refetch from the first window and deduplicate by ID. If the product later requires a perfectly consistent multi-page snapshot, add a backend snapshot/version token rather than pretending cursors alone guarantee it.

Required states:

| State | How to reach it | UI behavior |
| --- | --- | --- |
| Loading | Route is pending | Stable table-shaped skeleton; no layout jump |
| Success | Normal fixture/API response | Table, count, pagination |
| No projects exist | Empty data source | “No projects yet” and no active filter clear button |
| No matching projects | A filter/search finds zero results | “No projects match these filters” and a clear-filters action |
| Error | Data source/API throws | Clear message and retry action |

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
  version: number;
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

Boundary rules:

- timestamps are ISO-8601 UTC strings, for example `2026-08-28T10:15:00.000Z`; format them only in the UI;
- `version` is an opaque concurrency number used when updating the project; clients send the last version they read;
- domain code may use `Date`, but transport and persistence adapters own conversion to and from the wire format;
- IDs are stable identifiers, never array indexes or display names.

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

Keep `turbo.json` as the task graph, not a second package manager:

- `build` depends on upstream workspace builds and declares only real outputs (`.next/**` excluding its cache, and `dist/**`);
- `dev` is persistent and not cached;
- lint/typecheck/test dependencies reflect actual package imports rather than forcing every task to run sequentially;
- add `codegen`/`codegen:check` tasks when schema generation exists and make consuming builds depend on the generated contract;
- declare build-affecting environment variables in Turbo task configuration so a changed value invalidates the cache;
- never cache or upload artifacts that can contain secrets, user data, nondeterministic external responses, or local `.env` files.

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
    "codegen:check": "pnpm codegen && git diff --exit-code -- src/generated schema.graphql"
  }
}
```

## 3.3 Install and use a reproducible dependency graph

Pin both runtimes used by developers and CI. Keep the existing `packageManager` field for pnpm and add one repository-owned Node.js version declaration (`engines.node` plus the team's chosen version-manager file). Use an actively supported Node.js LTS release, test upgrades in a pull request, and make CI read the same declared version instead of maintaining an unrelated number in the workflow.

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
CORS_ALLOWED_ORIGINS=http://localhost:3000
AI_PROVIDER=
AI_API_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

`apps/shell/.env.example`:

```dotenv
GRAPHQL_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Implementation rules:

- Put actual values in `.env.local`/deployment secrets, never Git.
- Read `AI_API_KEY`, LiveKit secrets, and backend credentials only in `apps/api`.
- Browser values must use `NEXT_PUBLIC_` and must be safe for every visitor to see.
- Server Components use `GRAPHQL_API_URL`; browser Apollo code uses `NEXT_PUBLIC_GRAPHQL_API_URL`. Deployment may route these to internal and public endpoints respectively.
- Parse configuration once in a typed server-only module (for example with Zod), normalize the allowed-origin list, and validate required variables at startup; do not wait for the first user request.

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
│   │   ├── project-data-source.ts
│   │   └── projects.test.ts
│   └── activity/
│       ├── components/
│       └── activity-data-source.ts
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
    version: 3,
  },
  {
    id: "orion",
    name: "Orion",
    status: "PLANNED",
    owner: users[1],
    updatedAt: "2026-08-27T09:00:00.000Z",
    version: 1,
  },
  {
    id: "nova",
    name: "Nova",
    status: "PAUSED",
    owner: users[0],
    updatedAt: "2026-08-20T08:00:00.000Z",
    version: 2,
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

| Scenario | Fixture/data-source behavior | Used by |
| --- | --- | --- |
| Normal list | 3+ projects across statuses | `/projects` success state |
| Empty data source | `[]` before filtering | “No projects yet” state |
| No filter match | Normal list plus `q=does-not-exist` | “No matches” state |
| Project with no activity | Project exists, activity list is `[]` | Detail empty activity state |
| Not found | `getProject("unknown")` returns `null` | Route `not-found` state |
| Service error | Method throws `ProjectDataSourceError` | Route error state |
| Mutation failure | `updateStatus` rejects | Rollback/error UI |
| Stale update | `expectedVersion` is behind the stored version | Conflict message and authoritative-data refresh |

## 4.3 Create a feature data interface

Do not import the arrays directly into React components. Create:

```text
apps/shell/features/projects/project-data-source.ts
```

```ts
import type { Project, ProjectStatus } from "./model";

export type ProjectListInput = {
  query?: string;
  status?: ProjectStatus;
  sort: "name" | "updatedAt";
  direction: "asc" | "desc";
  first: number;
  after?: string;
};

export type ProjectListResult = {
  items: Project[];
  totalCount: number;
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
};

export interface ProjectDataSource {
  list(input: ProjectListInput): Promise<ProjectListResult>;
  getById(id: string): Promise<Project | null>;
  updateStatus(
    id: string,
    status: ProjectStatus,
    expectedVersion: number,
  ): Promise<Project>;
}
```

Then implement `fixture-project-data-source.ts`. This is a temporary UI seam, not a second domain/repository layer. It should:

1. clone fixture data rather than mutate exported arrays;
2. filter by status/search;
3. sort by the selected field plus `id` as a stable tie-breaker;
4. create opaque fixture cursors and return the requested window;
5. throw predictable errors only in an explicit error fixture;
6. append a status-change activity when a status changes.

Later, generated GraphQL operations replace this implementation. Keep fixtures behind MSW GraphQL handlers after that migration so tests exercise the same network contract as production. Do not maintain parallel handwritten API response types once client code generation exists.

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
  after?: string;
};

export function parseProjectSearchParams(
  params: Record<string, string | string[] | undefined>,
): ProjectSearchParams {
  // Trim q, validate every enum, bound cursor length/control characters, and return defaults.
}
```

Test this function before building controls. Test:

```text
empty params → defaults
after=<fixture/API cursor> → opaque value preserved
after=<overlong or control-character value> → omitted
status=ACTIVE → ACTIVE
status=UNKNOWN → ALL
q=%20apollo%20 → apollo
```

## 4.5 Implement the routes

### Root dashboard

Create `apps/shell/app/page.tsx` as a Server Component. It should fetch dashboard data from the fixture data source in Stage 2 and render:

- page heading;
- four status/count cards;
- recent activity list;
- Next.js `Link` to `/projects`.

Do not make the entire page a Client Component. Add client components only when an interaction requires them.

### Project list

Create `apps/shell/app/projects/page.tsx`:

1. await/parse `searchParams`;
2. call the data source with parsed input;
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
| Search | Debounce the URL replacement by 250–300ms; remove `after` |
| Status filter | Update URL immediately; remove `after` |
| Sort | Update sort/direction; remove `after` |
| Pagination | Put the server-provided cursor in the URL; preserve filters; use browser history for Previous initially |
| Clear filters | Remove `q`, `status`, and `after` |
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
pnpm --filter api add graphql graphql-yoga graphql-scalars zod
```

Add development tooling:

```bash
pnpm --filter api add -D typescript tsx vitest @types/node eslint @eslint/js typescript-eslint
pnpm --filter api add -D @graphql-codegen/typescript @graphql-codegen/typescript-resolvers @graphql-codegen/schema-ast
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
│   ├── server.ts                # process lifecycle only
│   ├── bootstrap.ts             # composition root
│   ├── context.ts               # actor/loaders/trace metadata
│   ├── transport/
│   │   ├── graphql/
│   │   │   ├── schema/
│   │   │   ├── resolvers/
│   │   │   └── yoga.ts
│   │   └── health.ts
│   ├── modules/
│   │   ├── projects/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   └── project-repository.ts
│   │   │   └── infrastructure/
│   │   │       ├── in-memory-project-repository.ts
│   │   │       └── backend-project-repository.ts
│   │   └── activity/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── ports/
│   │       └── infrastructure/
│   ├── generated/             # code generation output; never edit manually
│   └── test/
├── schema.graphql             # generated canonical contract artifact
├── codegen.ts
├── tsconfig.json
└── tsconfig.build.json
```

Do not add every folder pre-emptively. Create a layer when it contains real behavior. The important rule is dependency direction: transport and infrastructure depend on application/domain contracts, never the reverse. `bootstrap.ts` constructs adapters and injects them into use cases.

## 5.4 Write the first schema

Create `apps/api/src/transport/graphql/schema/project.graphql`:

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

scalar DateTime

type User {
  id: ID!
  name: String!
}

type Project {
  id: ID!
  name: String!
  status: ProjectStatus!
  owner: User!
  updatedAt: DateTime!
  version: Int!
}

type ProjectEdge {
  cursor: String!
  node: Project!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type ProjectConnection {
  edges: [ProjectEdge!]!
  nodes: [Project!]!
  totalCount: Int!
  pageInfo: PageInfo!
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
  expectedVersion: Int!
  clientMutationId: ID!
}

type UserError {
  code: String!
  message: String!
  field: [String!]
}

type UpdateProjectStatusPayload {
  project: Project
  activity: Activity
  userErrors: [UserError!]!
  clientMutationId: ID!
}

type Query {
  projects(
    filter: ProjectFilterInput
    sort: ProjectSortInput
    first: Int = 20
    after: String
    last: Int
    before: String
  ): ProjectConnection!
  project(id: ID!): Project
}

type Mutation {
  updateProjectStatus(input: UpdateProjectStatusInput!): UpdateProjectStatusPayload!
}
```

Create `apps/api/src/transport/graphql/schema/activity.graphql`:

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
  createdAt: DateTime!
}

extend type Query {
  recentActivity(projectId: ID!, limit: Int! = 20): [Activity!]!
}
```

Cursor rules:

- order by the requested field and then `id` as a unique, stable tie-breaker;
- encode the sort values and `id` in a versioned opaque cursor; clients only store and return it;
- validate cursor version, shape, and maximum length at the transport boundary;
- allow exactly one direction (`first`/`after` or `last`/`before`) and cap the window, for example at `100`;
- document whether `totalCount` is exact, cached, or eventually consistent when a real data source arrives.

Use a real `DateTime` scalar rather than an ambiguous `String`. Configure code generation to map it explicitly to the application's ISO timestamp type. Treat schema nullability as a compatibility promise: use non-null only when the service can guarantee the value without making a parent object disappear during a partial failure.

Register a validated `DateTime` scalar implementation (for example from `graphql-scalars`) in the executable schema. An SDL declaration alone does not validate or serialize dates.

## 5.5 Implement service boundaries

Resolvers must be thin. They translate GraphQL arguments into service calls.

```text
GraphQL resolver
  → application use case
    → domain policy + port interfaces
      ← InMemoryProjectRepository now
      ← BackendProjectRepository later
```

Application use-case responsibilities:

- validate/normalize list parameters;
- cap connection windows (for example, `1..100`);
- call an authorization policy using the hydrated actor, tenant, resource, and action;
- coordinate status update and activity creation;
- expose typed domain outcomes such as not found, validation failure, forbidden, and version conflict;
- remain independent of GraphQL and HTTP types.

`ProjectRepository` responsibilities:

- retrieve/persist project records;
- no GraphQL types;
- no UI formatting;
- no HTTP request-specific logic.

Important mutation sequence:

```text
authenticate request and build ActorContext
→ validate input and authorize action
→ load project
→ reject nonexistent project
→ compare expectedVersion with stored version
→ update status and increment version
→ create STATUS_CHANGED audit activity in the same transaction
→ store/recognize clientMutationId where a transport or downstream retry can duplicate the command
→ return updated project + activity
```

If `apps/api` becomes the deliberate Project system of record, status update and activity creation must be one database transaction. If an event is published after commit, use an outbox so a successful database commit cannot lose its event. If a downstream Project service is the system of record, that service must enforce the version/idempotency/atomic-audit guarantees; the BFF passes the actor and command metadata and maps the result. Do not simulate a distributed transaction across backend calls in the BFF. Use an explicit workflow/saga only when a real multi-service business process requires compensation. Do not retry mutations automatically unless the command has an idempotency strategy.

Scope an idempotency record by tenant/actor, operation, and `clientMutationId`; store the request fingerprint and completed outcome for a bounded retention period. A repeated key with the same input returns the original outcome. The same key with different input is rejected. A client-generated ID alone does not provide idempotency unless the server enforces these rules.

GraphQL error rules:

- expected business outcomes belong in `userErrors` with stable, documented codes such as `PROJECT_NOT_FOUND`, `FORBIDDEN`, `VALIDATION_FAILED`, and `VERSION_CONFLICT`;
- where revealing resource existence would be sensitive, authorization policy returns the same public outcome for forbidden and missing resources;
- unexpected faults use GraphQL errors with a stable `extensions.code` and `requestId`, while internal messages and stacks remain server-side;
- log each unexpected fault once at the boundary with correlation context; do not log the same exception in every layer;
- authorization belongs in application/domain policy so every transport—GraphQL, MCP, assistant, or future jobs—uses the same rule. Resolvers only obtain the actor and call the use case.

Create request-scoped loaders for nested fields such as `Project.owner`. Batch and cache only within one request to prevent N+1 calls without leaking one user's data into another request.

Add `dataloader` to `apps/api` only when the first batched field is implemented:

```bash
pnpm --filter api add dataloader
```

For backend-service adapters:

- set an explicit connect/response deadline with `AbortSignal` and propagate cancellation;
- retry only transient failures on idempotent reads, with a small bounded attempt count and jitter;
- pass correlation and trace headers, but never blindly forward browser credentials;
- map downstream payloads and errors at the adapter boundary; never leak backend DTOs into the domain;
- add circuit breakers or bulkheads only after telemetry shows a cascading-failure risk and document their fallback behavior.

## 5.6 Create GraphQL Yoga server

`src/server.ts` should:

1. build the schema once at startup;
2. create Yoga with a request context;
3. create a Node HTTP server;
4. listen on `API_PORT` (default `4000`);
5. provide separate liveness and readiness endpoints;
6. close cleanly for `SIGINT` and `SIGTERM`.

Expected local endpoints:

```text
http://localhost:4000/health/live
http://localhost:4000/health/ready
http://localhost:4000/graphql
```

Start the API:

```bash
pnpm --filter api dev
```

Test it manually after implementation:

```bash
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
```

```bash
curl http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"query { projects(first: 20) { totalCount nodes { id name status version } pageInfo { endCursor hasNextPage } } }"}'
```

Liveness only answers whether the process/event loop is alive. Readiness answers whether this instance can serve traffic and may check required downstream dependencies with short timeouts. Return `503` when unready, but do not expose dependency hostnames, credentials, or raw error messages. Remove readiness before shutdown, stop accepting new work, drain in-flight requests, and then close resources within the platform grace period.

## 5.7 Configure server code generation

Create `apps/api/codegen.ts` pointing at the SDL files and emitting resolver types into `src/generated`.

Conceptual configuration:

```ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/transport/graphql/schema/**/*.graphql",
  generates: {
    "schema.graphql": {
      plugins: ["schema-ast"],
      config: { includeDirectives: true },
    },
    "src/generated/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../context#GraphQLContext",
        scalars: { DateTime: { input: "string", output: "string" } },
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

`apps/api/schema.graphql` is the canonical, generated contract artifact. Commit it so CI and clients can compare the proposed contract with the base branch. Never edit it manually. If the API and clients later move to separate repositories or release cadences, publish this artifact to a schema registry instead of copying SDL between repositories.

## 5.8 Add API tests

Test at two levels.

### Service tests

Use Vitest to test:

- filter and sort behavior;
- cursor/window validation and limits;
- empty results;
- project not found;
- status update creates one activity;
- rejected update does not create activity.
- stale `expectedVersion` returns a conflict and changes nothing;
- repeated `clientMutationId` does not duplicate a successful command when idempotency is enabled.

### GraphQL integration tests

Call the Yoga fetch handler with GraphQL-over-HTTP requests. Test:

- successful `projects` query;
- invalid cursor/window combinations;
- unknown project;
- successful, forbidden, and version-conflict mutations;
- error shape does not leak internal stack traces.

Run integration tests against the built executable schema and real context construction—not resolver functions in isolation. When a real database or broker is introduced, add adapter integration tests against an ephemeral real dependency (for example, a disposable container) rather than mocking the driver's behavior.

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

- read the canonical generated contract from `../api/schema.graphql` (relative to `apps/shell`), never API implementation globs;
- scan shell GraphQL documents;
- emit client preset output to `lib/graphql/generated`;
- map `DateTime` explicitly to the ISO timestamp string type;
- use type-only imports;
- fail CI when generated output is stale.

Example operation co-located with the feature:

```ts
import { graphql } from "@/lib/graphql/generated";

export const ProjectListQuery = graphql(/* GraphQL */ `
  query ProjectList(
    $filter: ProjectFilterInput
    $sort: ProjectSortInput
    $first: Int!
    $after: String
  ) {
    projects(filter: $filter, sort: $sort, first: $first, after: $after) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        id
        name
        status
        updatedAt
        version
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
- assign one owner to each query: RSC/Next server fetch or Apollo client cache;
- do not fetch the same entity independently in both places without intentionally preloading/hydrating it;
- use the official Apollo Next.js integration to preload an Apollo-owned query in an RSC and consume it with `useReadQuery`/`useSuspenseQuery` in a Client Component;
- do not read Apollo-client-owned preloaded results as RSC data; use Client Components for optimistic mutation UI and subscription-driven updates;
- use `Project.id` as the normalized cache identity and define explicit connection merge policies keyed by filter/sort arguments;
- keep server/user-specific GraphQL responses `no-store` unless a deliberate authorization-safe cache and invalidation policy exists;
- do not duplicate remote GraphQL entities in Zustand, React context, or component state;
- mark server-only GraphQL/configuration modules with `server-only`, and pass minimum view models—not raw backend/context objects—from Server Components to Client Components;
- keep API URL configuration in environment variables.

### Migration order

Replace fixture data in this order:

1. project list query;
2. project detail query;
3. activity query;
4. status mutation with optimistic UI;
5. dashboard summary query.

Move fixtures behind MSW GraphQL handlers for component/integration tests and explicit failure scenarios after each production path is migrated.

## 5.11 Optimistic status mutation

Implement these steps in the status editor:

```text
User chooses a new status
→ validate that it differs from current status
→ update Apollo cache optimistically
→ disable duplicate submission
→ send updateProjectStatus with expectedVersion and a new clientMutationId
→ replace optimistic entity with server response
→ append returned activity if not already present
→ on VERSION_CONFLICT: rollback, refetch, and explain that the project changed elsewhere
→ on transport/unexpected error: rollback/refetch and show a retryable error
```

Tests must prove:

- status changes immediately under simulated latency;
- duplicate submit cannot occur;
- the optimistic result increments `version` consistently;
- a version conflict never overwrites a newer server value;
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
2. Otherwise insert it by the documented stable order `(createdAt, id)` descending.
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

Authenticate the connection and authorize the project when subscribing. Re-check authorization when the event infrastructure or token lifetime requires it. Subscriptions are notifications, not the source of truth: after a disconnect, refetch the authoritative query before applying new events.

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

Define an `ActivityEventBus` port with an in-memory adapter from the start, but do not add Redis/Kafka yet. Before running more than one API replica, replace the adapter with shared infrastructure or use a managed event gateway; otherwise subscribers connected to another replica will miss events. Assume at-least-once delivery and keep client/server deduplication by event ID.

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
├── domain/
│   └── assistant-policy.ts
├── application/
│   ├── stream-assistant-response.ts
│   └── stream-assistant-response.test.ts
├── ports/
│   └── ai-provider.ts          # interface owned by this project
└── infrastructure/
    └── provider-<chosen-name>.ts

apps/api/src/transport/http/
└── assistant-stream-route.ts
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

The HTTP route authenticates the actor, validates the request, passes an abort signal and actor context to the application use case, and translates typed outcomes to the streaming protocol. It must not contain prompting, authorization, provider selection, or project lookup rules.

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
3. calls the same Project/Activity application use cases used by GraphQL resolvers;
4. enforces the same authorization rules;
5. returns structured, bounded output;
6. emits a safe error result when downstream data is unavailable;
7. logs tool name, request ID, duration, outcome—not secrets/full sensitive data.

Never make the API call its own `/graphql` endpoint over HTTP merely to implement a tool. Call the application use case directly.

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

The CI workflow should run from a clean Linux runner using the repository-pinned Node.js active LTS and pnpm versions:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Once GraphQL code generation exists, make generated-output and contract checks required—not optional “later” checks:

```bash
pnpm --filter @repo/ui build-storybook
pnpm --filter shell codegen:check
pnpm --filter api codegen:check
pnpm graphql:schema:diff
pnpm graphql:documents:validate
pnpm test:e2e
```

Implement `codegen:check` by generating into a clean working tree and failing when `git diff --exit-code` detects stale output. Implement `graphql:schema:diff` with GraphQL Inspector (or the chosen schema registry) against the base branch's `apps/api/schema.graphql`. Block breaking changes; review dangerous changes; allow additive changes. Validate every committed client operation against the proposed schema.

If using GraphQL Inspector locally, install it as a root development tool when this gate is implemented:

```bash
pnpm add -Dw @graphql-inspector/cli
```

Recommended required pipeline order:

```text
install once with frozen lockfile
  ├─ lint + architecture boundary rules
  ├─ typecheck + generated-output checks
  ├─ unit/component tests
  ├─ schema diff + document validation
  └─ dependency/secret review
          ↓
       build immutable artifacts
          ↓
 integration/E2E/security smoke tests
```

Pin third-party CI actions to reviewed immutable commit SHAs, minimize workflow permissions, protect deployment environments, and never expose production secrets to untrusted pull-request jobs. Add dependency review and secret scanning. Generate an SBOM and artifact provenance/attestation when deployment artifacts are introduced; treat these as release evidence, not files developers edit.

## 11.2 End-to-end test scope

Use the smallest test boundary that proves the behavior:

| Test layer | What it proves | Preferred dependencies |
| --- | --- | --- |
| Domain/application unit | rules, authorization decisions, cursor/concurrency/idempotency behavior | pure fakes for owned ports |
| API integration | executable schema, context, adapters, error/transaction behavior | in-process Yoga; real ephemeral DB/broker when introduced |
| Shell component | accessible interaction and states | MSW GraphQL handlers generated/aligned with operations |
| Contract | schema compatibility and operation validity | canonical schema artifact plus committed documents |
| End-to-end | a few critical user journeys across built services | production-like shell/API, deterministic seeded environment |
| Load/resilience | capacity, timeout, reconnect, and dependency-failure assumptions | isolated non-production environment |

Do not chase a coverage percentage by testing framework internals. Require coverage of security and business invariants, and use mutation/branch coverage selectively for high-risk domain modules.

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

Initialize the OpenTelemetry SDK before importing application modules. Use automatic HTTP/runtime instrumentation plus manual spans around meaningful application operations. Set `service.name`, `service.version`, and deployment environment on every signal, propagate W3C trace context across shell/API/backend calls, and use low-cardinality attributes.

Introduce or accept a validated request/correlation ID at the API boundary. Return it to the caller and include it in structured logs for:

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

Do not put project IDs, user IDs, query text, prompts, or error messages in metric labels. They create unbounded cardinality or leak data. Put identifiers in access-controlled logs/traces only when policy permits, preferably hashed or redacted.

Define service-level objectives before alerting. A practical first set is:

- GraphQL availability and p95 latency for named operations;
- downstream dependency error/timeout rate;
- mutation conflict and failure rate;
- assistant time-to-first-token, completion/error rate, and cost/usage;
- subscription connection/reconnect count.

Alerts should correspond to user-visible SLO burn or an actionable dependency failure. Dashboards alone are not an incident response plan: document ownership, escalation, rollback, and a short runbook for each production alert.

## 11.4 GraphQL hardening before exposure

- terminate TLS and apply secure headers in the shell/API edge;
- authenticate before GraphQL execution and pass a hydrated actor to the context; authorize inside application/domain policy;
- enforce maximum connection windows and validate every scalar/input, including cursor length;
- add request-body, execution-time, alias, batch, depth, breadth, and measured query-cost limits;
- restrict CORS to known shell origins, while recognizing that CORS is not authorization;
- if browser authentication uses cookies, use `HttpOnly`, `Secure`, appropriate `SameSite`, origin checks, and CSRF protection for mutations;
- mask internal errors;
- rate-limit by authenticated subject/tenant and use IP only as an additional signal;
- authorize both object lookup and collection edges;
- use trusted/persisted documents for this first-party shell once operations stabilize; production may reject arbitrary documents;
- disable or access-control GraphiQL in production and make an explicit introspection policy, but never treat disabled introspection as the primary defense;
- enforce outbound host allowlists and URL parsing in adapters that accept any user-influenced URL to prevent SSRF;
- keep secrets in the deployment platform's secret manager, rotate them, and never expose them through `NEXT_PUBLIC_*` variables.

If multitenancy is introduced, make `tenantId` mandatory in actor/application context and every repository query, idempotency key, cache key, event, and audit record. Add cross-tenant negative tests at API and persistence boundaries; UI filtering is never a tenant-isolation control. Use database-level isolation as defense in depth where the selected datastore supports it.

Maintain a short threat model covering assets, actors, trust boundaries, abuse cases, and mitigations. Revisit it when adding authentication, multitenancy, file/URL input, assistant tools, subscriptions, or voice.

For AI and MCP, also require:

- data classification and an explicit list of context allowed to leave the API;
- prompt-injection threat tests and strict tool allowlists;
- typed tool inputs, output validation, authorization on every invocation, and output-size limits;
- human confirmation for destructive/high-impact tools; keep the first release read-only;
- retention/redaction policy, per-user/tenant quotas, cost limits, and complete audit events;
- untrusted model output rendered as data, never executed as code, HTML, SQL, shell, or a URL without validation.

## 11.5 Deployment compatibility rules

Because shell and API can deploy separately:

- add fields before consuming them;
- deploy API support before shell usage;
- stop using a field before removing it;
- deprecate fields with a reason and removal window; use usage data before removal;
- never change a field's meaning/type in place or reuse an enum value with new semantics;
- build once and promote the same immutable artifact through environments;
- run services as non-root with a read-only filesystem where practical, resource requests/limits, and graceful termination;
- use separate liveness/readiness probes for both services;
- deploy API support before shell consumers and verify mixed-version compatibility during rolling/blue-green rollout;
- use expand/migrate/contract database changes so old and new application versions can run together;
- keep configuration outside the artifact, validate it at startup, and fail fast on missing required values;
- write a rollback path for each deployment.

The shell and API may scale independently. Keep the API stateless between requests. Store subscriptions, idempotency records, sessions, and assistant conversations in shared infrastructure only when those features require them; do not rely on process memory in a multi-replica deployment.

## 11.6 Production readiness review

Before the first production deployment, assign an owner and evidence link for every row:

| Area | Required evidence |
| --- | --- |
| Architecture | current context/container diagrams, ADRs, dependency-boundary test |
| Contract | generated schema, no breaking diff, client documents validated |
| Security | threat model, authentication/authorization tests, secret and dependency scan |
| Reliability | timeout/retry policy, liveness/readiness, graceful-shutdown and rollback test |
| Data | transaction/idempotency/concurrency tests; backup/restore test when durable storage exists |
| Performance | representative load test, pagination/query-cost limits, agreed capacity assumptions |
| Observability | trace across shell → API → backend, SLO dashboard, alert and runbook |
| Delivery | immutable artifact, provenance/SBOM where required, environment promotion and rollback record |

Do not claim “enterprise ready” because every tool is installed. The review passes only when the team can demonstrate the behavior and operate failure scenarios.

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
- [ ] URL owns project-list filter/sort/cursor state.
- [ ] Status editor has pending/error behavior.
- [ ] Feature/component tests pass.

## Stage 3 complete

- [ ] `apps/api` runs independently.
- [ ] GraphQL schema owns project/activity contract.
- [ ] Resolver → application/domain port → infrastructure adapter boundaries are present and enforced.
- [ ] Shell uses typed GraphQL operations for list/detail/mutation.
- [ ] API and client codegen checks pass.
- [ ] Schema diff and client-document validation pass.
- [ ] Optimistic status mutation rolls back safely.
- [ ] Version-conflict and idempotency behavior is tested.

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
- [ ] Production readiness review has an owner and evidence for every area.
- [ ] Microfrontend decision is evidence-based, not automatic.

---

# 15. Primary architecture references

Use these primary sources when implementing or revisiting the decisions in this guide. Re-check the current version of a technology's documentation at implementation time.

## GraphQL contract and runtime

- [GraphQL pagination](https://graphql.org/learn/pagination/) — opaque cursors, connections, edges, and page information.
- [GraphQL authorization](https://graphql.org/learn/authorization/) — authenticate before execution and keep authorization in business logic.
- [GraphQL schema design](https://graphql.org/learn/schema-design/) — nullability and additive, versionless evolution.
- [GraphQL security](https://graphql.org/learn/security/) — trusted documents, pagination, depth/breadth/batch/cost limits, rate limits, and safe errors.
- [GraphQL over HTTP](https://graphql.org/learn/serving-over-http/) — endpoint, authentication middleware, request methods, and response status behavior.
- [GraphQL Yoga production guidance](https://the-guild.dev/graphql/yoga-server/docs/prepare-for-production) and [health checks](https://the-guild.dev/graphql/yoga-server/docs/features/health-check) — persisted operations, request limits, readiness, and safe health output.
- [GraphQL Inspector schema diff](https://the-guild.dev/graphql/inspector/docs/commands/diff) — classify and block breaking schema changes in CI.

## Next.js and Apollo

- [Next.js App Router data security](https://nextjs.org/docs/app/guides/data-security) — server/client boundaries, minimal data transfer, `server-only`, and mutation authorization.
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist), [CSP guide](https://nextjs.org/docs/app/guides/content-security-policy), and [self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) — caching, security headers, runtime configuration, reverse proxies, and production verification.
- [Apollo Client Next.js integration](https://www.apollographql.com/docs/react/integrations/nextjs) — explicit RSC/Client Component ownership and query preloading/hydration.

## Security, observability, and delivery

- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html) — input, authorization, batching/N+1, query limits, and error controls.
- [OpenTelemetry JavaScript instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/) and [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) — initialize before application modules, propagate context, and use standardized attributes.
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use) and [artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations) — immutable action references, minimum permissions, dependency review, and provenance.
