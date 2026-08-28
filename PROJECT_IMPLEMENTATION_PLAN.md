# AI Project Operations Dashboard — Human Implementation Plan

## Purpose of this document

This is a human implementation roadmap for the current `production-lab` repository. It is meant to be followed one checkbox at a time. It explains:

- what to build;
- why it belongs in the project;
- how to approach it without prescribing every line of code;
- how to verify that the work is complete;
- what not to add yet.

This is not a deadline or an instruction to implement every technology immediately. Complete each stage, verify its exit criteria, and only then move to the next stage.

## How to use the checklist

For each checkbox:

1. Read the **Why** before writing code.
2. Follow the **How** as a boundary, not as copy-and-paste code.
3. Run the **Check** yourself and record any important decision in an ADR or pull request description.
4. Do not mark a stage complete until every required exit criterion passes.

Recommended working rhythm:

- Keep each pull request focused on one vertical slice or one infrastructure concern.
- Prefer working software over creating empty folders for future ideas.
- Add a dependency only when the current stage uses it.
- Keep generated files clearly identified and never edit them manually.
- Update this document when a deliberate architectural decision changes.

---

## 1. Product definition

Build a compact, production-style **AI Project Operations Dashboard**.

The primary user journey is:

```text
Open dashboard
→ browse/search projects
→ open a project
→ review project details and recent activity
→ update project status
→ ask the AI assistant what changed
→ AI uses MCP tools to retrieve project data
→ optionally repeat the conversation by voice through LiveKit
```

### Required product areas

1. Project list at `/projects`
2. Project details at `/projects/[id]`
3. Activity feed inside project details
4. Text AI assistant as a project-scoped panel
5. Voice assistant added only after the text assistant is reliable

### Intentionally excluded

Do not add these unless the learning goal changes:

- payments or subscriptions;
- complex authentication and permissions;
- teams and organization administration;
- notification center;
- profile management;
- mobile app;
- a large database model;
- many unrelated CRUD screens;
- microfrontends before the monolith works.

---

## 2. Current repository assessment

The project is at the beginning of Stage 1, not at the beginning of feature development.

| Area | Current state | Gap to close |
| --- | --- | --- |
| Root workspace | pnpm workspaces and Turbo root commands exist | Verify every workspace has the scripts that apply to it and that CI runs them |
| `apps/shell` | Next.js 16 App Router, strict TypeScript, Tailwind, a sample shared button | Replace starter UI; add real routes, test config, GraphQL client, error/loading boundaries |
| `apps/api` | Package manifest and GraphQL Codegen CLI only | No Node server, GraphQL schema, resolver, service adapter, build, lint, typecheck, or real test yet |
| `packages/ui` | One custom button plus generated Storybook examples | Decide public component API; remove tutorial artifacts; add accessible production components and tests |
| Data | None | Define minimal `Project`, `User`, and `Activity` contract and seed repository |
| Testing | Dependencies/configuration are partially present | Add meaningful commands and tests at the correct layer |
| Delivery | No visible CI/deployment contract | Add frozen installs, quality gates, environment validation, logging, and deployment checks |

### Important consequence

Do not start with AI, voice, MCP, real-time transport, or microfrontends. Those features depend on a stable project model, a functioning GraphQL boundary, tested UI states, and clear ownership.

---

## 3. Target architecture

### Runtime flow before voice

```text
Browser
  │
  ▼
apps/shell — Next.js UI
  │
  ├── GraphQL queries/mutations/subscriptions
  │
  ▼
apps/api — Node.js GraphQL BFF
  │
  ├── project service adapter
  ├── activity service adapter
  ├── AI orchestration endpoint
  └── MCP client/server boundary
  │
  ▼
Seeded repository first; real backend services later
```

The API is a **GraphQL backend-for-frontend (BFF)**. It owns the frontend-facing GraphQL schema and adapts backend-service responses into that schema. The browser does not call backend services or MCP tools directly.

### Runtime flow after voice

```text
Browser ── WebRTC ── LiveKit ── Voice agent
   │                                │
   │ GraphQL / assistant stream     │ MCP
   ▼                                ▼
Next.js shell ──────────────── Node.js API / project tools
```

### Ownership rules

| Location | Owns | Must not own |
| --- | --- | --- |
| `apps/shell` | Routes, product UI, GraphQL operations, browser interaction, URL state, assistant/voice presentation | GraphQL resolvers, backend credentials, direct backend-service access |
| `apps/api` | GraphQL schema/resolvers, service adapters, authorization, AI orchestration, MCP tools, server-only secrets | React components or browser state |
| `packages/ui` | Reusable presentational components, accessibility behavior, styling contracts, Storybook stories | Project-specific fetching, GraphQL operations, routes, business workflows |
| Future `apps/voice-agent` | LiveKit agent runtime and voice session orchestration | Duplicated project business logic or a second project data model |

### Proposed structure as the project grows

Create folders only when the corresponding stage begins.

```text
apps/
  shell/
    app/
      (dashboard)/
        layout.tsx
        projects/
          page.tsx
          loading.tsx
          error.tsx
          [id]/
            page.tsx
            loading.tsx
            error.tsx
    features/
      projects/
      activity/
      assistant/
      voice/
    lib/
      graphql/
      env/
      observability/
  api/
    src/
      server.ts
      context.ts
      schema/
      modules/
        projects/
        activity/
        assistant/
      services/
      repositories/
      mcp/
      observability/
  voice-agent/                 # add in Stage 7 only if a separate process is required

packages/
  ui/
    src/
      components/
      primitives/
      index.ts
```

Do not create a generic `utils`, `common`, or `shared` package. Keep code with its owner until at least two workspaces genuinely need the same stable abstraction.

---

## 4. Architecture decisions to hold constant

These decisions keep the learning project coherent. Change one only through a short Architecture Decision Record (ADR) explaining the reason and consequences.

### Rendering and client state

- Next.js pages and layouts remain Server Components by default.
- Add `"use client"` only around interactive leaves such as filters, status editing, the assistant, and voice controls.
- Keep filter, sort, and pagination state in the URL so pages are linkable and browser navigation works.
- Use Apollo Client for GraphQL-backed client interactions, normalized caching, optimistic mutation practice, and subscriptions.
- Use Zustand only for ephemeral browser UI state that is not server data, such as whether the assistant drawer is open. Do not copy GraphQL entities into Zustand.
- Assign one owner for each query result. Avoid fetching the same entity independently in both an RSC request and Apollo’s browser cache unless hydration is intentionally implemented.

Next.js recommends Server Components for server-side data access and small client boundaries for interactivity. Apollo provides a maintained App Router integration for RSC, SSR, streaming, and browser cache hydration.

### GraphQL approach

- Use GraphQL Yoga in `apps/api` unless a documented requirement favors another server.
- Start schema-first with a small SDL because learning and reviewing the API contract is a goal.
- Use GraphQL Code Generator separately for server resolver types and shell operation types.
- Co-locate frontend fragments/operations with the feature that consumes them; put generated output in a clearly named generated directory.
- Start with offset/page pagination because the product asks for page navigation and the seeded dataset is small. Always use a stable secondary sort such as `id`.
- Enforce a maximum page size. Re-evaluate cursor pagination if the list becomes large or changes frequently in real time.
- Treat activity as append-only events; project status is current state.

### Real-time approach

- Implement ordinary queries first, then polling as a diagnostic baseline, then a GraphQL subscription.
- Prefer GraphQL-over-SSE with Yoga for the one-way activity stream. It uses normal HTTP and has built-in reconnection characteristics.
- Use WebSockets only if the explicit learning goal requires them or measurement shows SSE is insufficient.
- Replace in-memory pub/sub before horizontally scaling the API; multiple API replicas require a shared broker such as Redis or Kafka.

### Testing approach

- Pure business logic: Vitest.
- React behavior: Vitest plus React Testing Library and `user-event`.
- Network scenarios: MSW at the network boundary.
- Shared components: Storybook interaction and accessibility checks.
- API: resolver/service unit tests plus GraphQL-over-HTTP integration tests.
- Critical end-to-end journeys: Playwright.
- Do not duplicate the full Playwright suite in Cypress. If Cypress is a learning goal, implement one small comparison exercise and document the trade-offs.

Tests should assert user-visible behavior and remain isolated. Async Server Components are better covered by end-to-end tests than by forcing them into a unit-test environment.

### Security approach

- All secrets stay in server-only environment variables.
- The GraphQL API validates input, enforces authorization in the service/resolver boundary, caps pagination, and limits query cost/depth before production exposure.
- MCP tools begin read-only. Any future mutation tool requires explicit confirmation, authorization, audit logging, and idempotency.
- Never pass a browser access token through MCP to downstream services. Each resource must receive a token intended for that resource.
- LiveKit access tokens are short-lived and issued server-side for a specific room/participant.

---

## 5. Definition of Done for every production change

A feature is not done because the happy path renders.

- [ ] The acceptance behavior is written before implementation.
- [ ] Loading, empty, error, and success states are handled where applicable.
- [ ] Keyboard navigation and visible focus are verified.
- [ ] Types pass without `any` added as an escape hatch.
- [ ] Relevant unit/integration tests pass.
- [ ] The critical user journey is covered or updated at the appropriate test layer.
- [ ] Errors are useful to users but do not leak secrets or internals.
- [ ] Logs contain correlation/request information when server work is involved.
- [ ] No generated build output, dependency directory, local log, or secret is committed.
- [ ] Root `lint`, `typecheck`, `test`, and `build` commands remain green.
- [ ] Documentation or an ADR is updated when behavior or architecture changed.

---

# Stage 0 — Blueprint and decision baseline

## Goal

Make the product behavior and boundaries explicit before adding infrastructure.

### Checklist

- [ ] Write acceptance criteria for the four meaningful screens/states.
  - **Why:** A small product still needs a stable definition of success; otherwise infrastructure work expands without improving the user journey.
  - **How:** Describe `/`, `/projects`, `/projects/[id]`, and the project-scoped assistant panel. For each, list the user goal and loading, empty, error, and success behavior.
  - **Check:** Another developer can describe the full product without reading source code.

- [ ] Define the minimal domain vocabulary.
  - **Why:** Shared names prevent the UI, GraphQL API, MCP tools, and voice agent from inventing different models.
  - **How:** Document `Project`, `User`, `Activity`, `ProjectStatus`, and allowed activity types. Decide whether timestamps are ISO-8601 UTC strings at boundaries.
  - **Check:** Every field has a reason to exist and maps to a visible product behavior.

- [ ] Define the first project-list contract.
  - **Why:** Search, filter, sort, and pagination interact; deciding their semantics early prevents incompatible UI and API implementations.
  - **How:** Specify searchable fields, allowed statuses, sortable columns, default sort, page size, maximum page size, and how invalid URL parameters fall back.
  - **Check:** Given a sample URL, a developer can predict the returned order and page.

- [ ] Record initial ADRs.
  - **Why:** Decisions such as keeping a separate API and using SSE later are intentional trade-offs, not universal truths.
  - **How:** Create short Markdown ADRs for: separate GraphQL BFF, Apollo client choice, schema-first GraphQL, and deferring microfrontends.
  - **Check:** Each ADR contains context, decision, alternatives, and consequences.

### Exit criteria

- [ ] Product acceptance criteria and domain definitions are reviewable.
- [ ] No speculative app or package has been created.

---

# Stage 1 — Monorepo and engineering foundation

## Goal

Make the repository provide one reliable development and CI workflow before feature work.

### Checklist

- [o] Complete applicable scripts in every workspace.
  - **Why:** Turbo can orchestrate only scripts that a workspace actually declares.
  - **How:** Add real `dev`, `build`, `lint`, `typecheck`, and `test` scripts where they apply. Replace placeholder failing tests. Keep `apps/shell` build as `next build`; Turbo remains the orchestrator.
  - **Check:** `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` have predictable behavior from the root.

- [0] Decide whether `packages/ui` is just-in-time or compiled.
  - **Why:** Its current export points directly to TypeScript source, which is a valid JIT package but has no independent build artifact for Turbo to cache.
  - **How:** Keep it JIT for now because only Next.js consumes it. Give it lint/typecheck/test scripts. Switch to a compiled `dist` package only when non-Next consumers, independent publishing, or build-boundary performance justify it.
  - **Check:** The decision is documented and `apps/shell` can import the public UI entry point in development and production builds.

- [0] Standardize TypeScript and lint rules without premature package extraction.
  - **Why:** Strict settings catch contract mistakes, but empty shared-config packages add indirection.
  - **How:** Keep `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride`. Align the API and UI settings. Extract a shared config only after two or more configs contain meaningful duplicated rules.
  - **Check:** Each workspace passes `typecheck`; lint behavior is consistent for equivalent code.

- [0] Clean generated starter and debug artifacts.
  - **Why:** Tutorial stories and local logs obscure the real design system and create noisy reviews.
  - **How:** Remove generated examples only after the first real story replaces them. Ignore local logs, coverage, Turbo cache, Next output, Playwright output, and all `node_modules` directories.
  - **Check:** A fresh build/test run leaves `git status` clean.

- [ ] Add environment-variable contracts.
  - **Why:** The shell, API, AI provider, and LiveKit will eventually require different public and private configuration.
  - **How:** Add `.env.example` files without secrets, validate variables at process startup, and expose only explicitly public browser variables.
  - **Check:** Missing required configuration fails early with a useful message; secrets do not appear in client bundles or logs.

- [0] Add a minimal CI workflow.
  - **Why:** Reproducibility is only proven on a clean machine.
  - **How:** Run `pnpm install --frozen-lockfile`, lint, typecheck, unit/integration tests, and build. Cache pnpm’s store and optionally Turbo outputs; do not cache undeclared nondeterministic outputs.
  - **Check:** CI passes from a fresh clone and fails when `package.json` and `pnpm-lock.yaml` disagree.

- [0] Establish branch/PR quality rules.
  - **Why:** Small reviewable changes make a learning project easier to debug and explain in interviews.
  - **How:** Require a problem statement, scope, verification commands, screenshots for UI changes, and an ADR link for architecture changes.
  - **Check:** A reviewer can verify a PR without reconstructing the author’s intent.

### Exit criteria

- [0] One command starts the necessary local services.
- [0] All root quality commands pass.
- [0] A fresh clone installs with a frozen lockfile.
- [0] Running the commands does not create untracked noise.

---

# Stage 2 — Product UI using a controlled mock boundary

## Goal

Build the normal product experience before introducing distributed-system and AI complexity.

### Checklist

- [ ] Create a small typed fixture dataset.
  - **Why:** UI work needs realistic states without waiting for the GraphQL server.
  - **How:** Create a handful of projects, owners, and activities including active, planned, paused, empty-activity, and error scenarios. Keep access behind a feature-level data interface or MSW handler rather than importing fixture arrays throughout components.
  - **Check:** Every required screen state can be reproduced deterministically.

- [ ] Build the dashboard layout and navigation.
  - **Why:** A shared layout establishes page hierarchy, landmarks, skip navigation, responsive behavior, and focus expectations.
  - **How:** Use semantic header/nav/main elements and Next.js layouts. Keep navigation links and page titles meaningful.
  - **Check:** Keyboard-only navigation reaches all major areas in a sensible order.

- [ ] Build `/projects` with URL-owned controls.
  - **Why:** Search, filtering, sorting, and pagination should survive refresh, back/forward navigation, and link sharing.
  - **How:** Parse and validate `searchParams`; render from the URL; debounce only the URL update, not the source of truth. Use semantic form controls and a table that remains understandable on narrow screens.
  - **Check:** Copying the URL into a new tab reproduces the same result set and controls.

- [ ] Implement all project-list states.
  - **Why:** Production interfaces spend meaningful time loading, empty, and failing—not only succeeding.
  - **How:** Add a layout-stable skeleton, “no projects exist,” “no filter matches,” recoverable error, and normal table states.
  - **Check:** Each state is directly testable without editing source code.

- [ ] Build `/projects/[id]`.
  - **Why:** This becomes the integration point for status mutation, activity, AI, and voice.
  - **How:** Show name, status, owner, timestamps, activity, and assistant trigger. Define a not-found behavior separately from a service error.
  - **Check:** Valid, missing, and failing project cases render the correct accessible response.

- [ ] Build status editing as a focused interaction.
  - **Why:** This becomes the first mutation and optimistic-update exercise in Stage 3.
  - **How:** Use a labelled control/dialog, explicit pending state, cancel path, success feedback, and recoverable error. Keep the mocked update behind the data interface.
  - **Check:** Double submission is prevented and keyboard focus returns to a sensible location.

- [ ] Add behavior-focused shell tests.
  - **Why:** Tests should preserve user behavior while allowing component internals to change.
  - **How:** Use role/label/text queries and `user-event`. Use MSW for network scenarios. Cover URL controls, empty/error handling, detail rendering, and status editing.
  - **Check:** Tests do not depend on CSS class names or private component state.

### Exit criteria

- [ ] The complete non-AI flow works with deterministic mock data.
- [ ] Loading, empty, error, and success states are demonstrated.
- [ ] Keyboard and responsive checks pass.
- [ ] No GraphQL client has been added merely to render fixtures.

---

# Stage 3 — GraphQL BFF and end-to-end type safety

## Goal

Replace the mock boundary with a real, independently runnable Node.js GraphQL service while preserving the Stage 2 behavior.

### Checklist

- [ ] Bootstrap the API runtime with GraphQL Yoga.
  - **Why:** `apps/api` currently has Codegen but no server. Yoga provides a standards-oriented GraphQL-over-HTTP server and a direct path to subscriptions later.
  - **How:** Add a Node HTTP entry point, `/graphql`, a lightweight health/readiness endpoint, graceful shutdown, and real workspace scripts. Bind configuration through validated environment variables.
  - **Check:** The API starts independently, reports readiness, and shuts down without dropping in-flight work abruptly.

- [ ] Define the minimal schema.
  - **Why:** The GraphQL schema is the frontend contract, not a mirror of every backend-service object.
  - **How:** Define `Project`, `User`, `Activity`, `ProjectStatus`, project list arguments/result metadata, `project(id)`, and `updateProjectStatus`. Use nullability intentionally; do not make everything optional.
  - **Check:** Every schema field serves a current screen or the next immediate stage.

- [ ] Create repository and service boundaries.
  - **Why:** Resolvers should translate GraphQL requests, not contain storage or downstream HTTP logic.
  - **How:** Use `resolver → domain/service → repository or backend adapter`. Start with an in-memory seeded repository that implements the same interface a future HTTP backend adapter will implement.
  - **Check:** Resolver tests can replace the repository without changing the schema or UI.

- [ ] Implement deterministic list behavior.
  - **Why:** Pagination becomes unreliable when filtering/sorting semantics differ between client and server.
  - **How:** Validate allowed filters/sorts, cap page size, apply a stable secondary sort, and define case/whitespace behavior for search.
  - **Check:** Repeated requests over unchanged data return the same page order.

- [ ] Implement mutation and activity recording atomically.
  - **Why:** Updating status and writing “status changed” activity must not disagree.
  - **How:** Put the operation in the service boundary; return the updated project and new activity. When a real database arrives, make this one transaction.
  - **Check:** A failed update creates neither partial project state nor a false activity event.

- [ ] Add typed server resolvers with GraphQL Codegen.
  - **Why:** Schema changes should produce compile-time feedback in resolver implementations.
  - **How:** Configure server-side code generation in `apps/api`; generate resolver/context types; map domain models deliberately where necessary.
  - **Check:** An incompatible schema/resolver change fails `typecheck` or `codegen:check`.

- [ ] Add Apollo Client using its official Next.js integration.
  - **Why:** The project explicitly aims to practice normalized caching, optimistic updates, and subscriptions in an App Router application.
  - **How:** Configure absolute server-side and public browser endpoint URLs. Define a deliberate RSC/client-query ownership strategy. Add the Apollo provider only around the subtree that needs it.
  - **Check:** Initial HTML contains meaningful content and browser interactions update the Apollo cache without duplicate conflicting requests.

- [ ] Add client operation code generation.
  - **Why:** Handwritten response interfaces drift from the schema.
  - **How:** Move client Codegen dependencies to `apps/shell`; use the Codegen client preset; scan co-located operations/fragments; treat generated files as build artifacts or committed artifacts according to one documented policy.
  - **Check:** Renaming/removing a selected schema field causes codegen/typecheck to fail in the consuming feature.

- [ ] Replace mocks one vertical slice at a time.
  - **Why:** A gradual replacement keeps failures attributable.
  - **How:** Integrate project list first, then project details/activity, then status mutation. Keep MSW for tests and exceptional UI scenarios, not as production data.
  - **Check:** The Stage 2 acceptance suite passes against the real GraphQL boundary.

- [ ] Implement optimistic status updates with rollback.
  - **Why:** Optimistic UI improves perceived responsiveness but must recover correctly when the server rejects a change.
  - **How:** Update the normalized project cache, prevent duplicate mutation submission, and restore/refetch on error. Show accessible pending/success/error feedback.
  - **Check:** Simulated latency feels responsive; a forced error returns the UI to the authoritative server state.

- [ ] Add API security baselines.
  - **Why:** GraphQL accepts expressive requests that can be expensive or expose data if left unrestricted.
  - **How:** Validate inputs, cap collection sizes, set request/body/time limits, restrict CORS to known origins, mask internal errors, add query depth/cost controls, and put authorization checks at the data/service boundary.
  - **Check:** Oversized, malformed, unauthorized, and overly complex requests fail safely.

### Exit criteria

- [ ] Shell and API run independently and together.
- [ ] Project list, detail, and status mutation use GraphQL end to end.
- [ ] Generated types cover both resolvers and client operations.
- [ ] UI behavior did not regress when mocks were replaced.
- [ ] API integration tests cover success, validation, not-found, and downstream failure.

---

# Stage 4 — Design system and accessibility hardening

## Goal

Extract stable, reusable UI behavior after real product usage reveals the correct abstractions.

### Checklist

- [ ] Audit product repetition before extracting components.
  - **Why:** A design system should encode proven patterns, not guesses.
  - **How:** Identify repeated visual/behavioral patterns in Stage 2–3. Keep feature-specific components inside `apps/shell`.
  - **Check:** Every new `packages/ui` component has at least two plausible consumers or represents a foundational primitive.

- [ ] Establish the first production component set.
  - **Why:** Button, badge, dialog, table primitives, skeleton, empty state, and error state cover the product’s repeated interactions.
  - **How:** Define variants, states, keyboard behavior, focus handling, and public exports. Prefer semantic HTML and composition over large prop APIs.
  - **Check:** Product screens consume public package exports without importing internal files.

- [ ] Replace generated Storybook tutorial content.
  - **Why:** Stories should document this product’s component contracts.
  - **How:** Add stories for default, disabled, pending, error, empty, long-content, and narrow-viewport cases. Remove tutorial components/assets after replacements exist.
  - **Check:** Storybook is a useful catalogue of the actual UI package.

- [ ] Automate component interaction and accessibility checks.
  - **Why:** Accessibility regressions are easier to catch at the component boundary.
  - **How:** Use Storybook interaction tests and its accessibility tooling; add keyboard assertions where automation is meaningful.
  - **Check:** CI fails on known serious accessibility violations and broken interactions.

- [ ] Perform a WCAG 2.2 AA manual pass.
  - **Why:** Automation cannot judge logical focus order, understandable labels, or all assistive-technology behavior.
  - **How:** Check keyboard-only use, visible/unobscured focus, headings/landmarks, labels/errors, contrast, reduced motion, live status announcements, dialog focus trapping/restoration, and zoom/reflow.
  - **Check:** Record the manual test matrix and resolve all high-impact findings.

### Exit criteria

- [ ] Shared components are product-derived, documented, and tested.
- [ ] The main project flow works using keyboard only.
- [ ] Loading and mutation status changes are announced appropriately.

---

# Stage 5 — Real-time activity

## Goal

Make activity update live while preserving correctness during reconnects and duplicate delivery.

### Checklist

- [ ] Define event identity and ordering rules.
  - **Why:** Real-time clients can receive duplicates, delayed events, and reconnect replays.
  - **How:** Give every activity a stable ID and server timestamp/sequence. Define deduplication by ID and deterministic ordering.
  - **Check:** Replaying the same event twice produces one visible item.

- [ ] Establish a polling baseline.
  - **Why:** Polling proves the refresh/merge behavior before transport complexity is added and provides a fallback.
  - **How:** Refresh recent activity at a conservative interval; pause when the page is hidden if appropriate; merge by event ID.
  - **Check:** New activity appears without full page reload and without duplicates.

- [ ] Add a GraphQL activity subscription over SSE.
  - **Why:** The activity feed is server-to-client, so SSE is simpler than a bidirectional socket and is Yoga’s recommended default.
  - **How:** Add a project-scoped subscription, connection cleanup, bounded exponential backoff with jitter, connection-state UI, and a refetch after reconnect to fill gaps.
  - **Check:** Disconnecting and restoring the network recovers without losing or duplicating events.

- [ ] Separate snapshot and event responsibilities.
  - **Why:** Subscriptions should notify changes; a normal query remains the authoritative snapshot.
  - **How:** Load the initial activity query, apply events to it, and refetch on uncertain gaps or invalidation.
  - **Check:** Reloading the page yields the same authoritative activity state as the live view.

- [ ] Test ordering, cleanup, and failure modes.
  - **Why:** Real-time bugs often appear only during navigation, reconnection, or component remounts.
  - **How:** Test duplicate events, out-of-order events, reconnect, project switching, unmount cleanup, and server error.
  - **Check:** No subscription remains after leaving the page and no event crosses into another project.

- [ ] Add a shared broker only when scaling requires it.
  - **Why:** In-memory pub/sub works for one API process but not across replicas.
  - **How:** Keep an event-bus interface; replace it with Redis/Kafka only before multi-instance deployment.
  - **Check:** A documented deployment topology explains whether cross-instance delivery is required.

### Exit criteria

- [ ] Activity updates live and recovers from network interruption.
- [ ] Deduplication, ordering, and cleanup tests pass.
- [ ] The implementation has an explicit single-instance or distributed pub/sub assumption.

---

# Stage 6 — Text AI assistant

## Goal

Build a reliable project-scoped text assistant before giving it MCP tools or voice.

### Checklist

- [ ] Define assistant boundaries and privacy rules.
  - **Why:** AI features must not send arbitrary application data or secrets to a model provider.
  - **How:** Specify allowed project context, retention behavior, conversation limits, redaction rules, and provider configuration. Keep provider credentials in `apps/api`.
  - **Check:** A reviewer can list exactly what data leaves the application and why.

- [ ] Create a provider-neutral server adapter with one implementation.
  - **Why:** Business/UI code should not depend on a provider SDK, but a speculative multi-provider framework is unnecessary.
  - **How:** Define the small interface the product needs—stream response, abort, usage metadata—and implement one chosen provider.
  - **Check:** The assistant module can be tested with a deterministic fake adapter.

- [ ] Implement streaming over an appropriate HTTP endpoint.
  - **Why:** Token streaming is a transport concern and need not be forced into the GraphQL schema.
  - **How:** Host the assistant endpoint in `apps/api`; stream incremental output; propagate cancellation with `AbortSignal`; close provider work when the client disconnects.
  - **Check:** The first text appears before the full response completes and cancellation stops server work.

- [ ] Model explicit assistant UI states.
  - **Why:** A single `isLoading` Boolean cannot explain connection, streaming, tool, cancellation, and retry states.
  - **How:** Define a state model such as `idle → submitting → streaming → complete`, with explicit `cancelled` and `error` paths. Reserve tool states for Stage 7.
  - **Check:** Every transition has visible UI and a test.

- [ ] Build accessible streaming interaction.
  - **Why:** Continuously changing text can overwhelm screen-reader users or steal focus.
  - **How:** Keep focus stable, provide a stop button, avoid announcing every token, announce completion/status at useful intervals, and preserve the submitted prompt.
  - **Check:** The flow works with keyboard and screen-reader announcements remain understandable.

- [ ] Add operational controls.
  - **Why:** Model calls have latency, cost, rate, and availability limits.
  - **How:** Add timeouts, input/output limits, rate limiting, request IDs, structured latency/usage logging, safe user errors, and retry only where idempotent.
  - **Check:** Timeout, rate limit, provider error, malformed stream, cancellation, and success are tested.

### Exit criteria

- [ ] Text conversation streams, cancels, retries safely, and handles errors.
- [ ] No MCP or voice code is needed for the text assistant to be useful.
- [ ] Provider credentials and sensitive context remain server-side.

---

# Stage 7 — MCP tools and LiveKit voice

## Goal

Give the assistant controlled access to project data, then expose the same assistant capability through voice.

## 7A. MCP checklist

- [ ] Define only four read-only tools initially.
  - **Why:** A small trusted tool surface is easier for the model, user, and security review to understand.
  - **How:** Implement `getProject`, `searchProjects`, `getRecentActivity`, and `getProjectMetrics`. Use precise descriptions, strict input schemas, structured outputs, limits, and stable error codes.
  - **Check:** Each tool maps to a real user question and cannot mutate state.

- [ ] Reuse the API service layer.
  - **Why:** GraphQL and MCP should not develop different business rules or data access paths.
  - **How:** Tool handlers call the same project/activity services used by resolvers. Do not make loopback HTTP calls from the API process to its own GraphQL endpoint unless exercising the network boundary is an explicit goal.
  - **Check:** Authorization, filtering, and errors behave consistently through GraphQL and MCP.

- [ ] Use the current stable MCP TypeScript SDK and Streamable HTTP for remote access.
  - **Why:** The older standalone HTTP+SSE MCP transport is deprecated for new implementations.
  - **How:** Pin the SDK version, expose a scoped MCP endpoint, validate origins/hosts and input, and keep protocol code separate from tool business logic.
  - **Check:** An MCP inspector/client can list and call only the intended tools.

- [ ] Add authorization and least privilege before remote exposure.
  - **Why:** MCP tools expose application data to model-controlled calls.
  - **How:** Validate token audience, do not pass incoming tokens to downstream services, request minimal scopes, filter tools by authorization, and use short-lived credentials.
  - **Check:** A token intended for another resource is rejected and unauthorized users receive no project data.

- [ ] Make tool activity visible in the assistant UI.
  - **Why:** Users should understand when the model accesses application data.
  - **How:** Show tool name/purpose, running/success/error status, and a concise result summary. Require confirmation before any future side-effecting tool.
  - **Check:** The user can distinguish model text from verified tool activity.

- [ ] Test prompt/tool failure cases.
  - **Why:** Models can choose the wrong tool or send invalid arguments.
  - **How:** Test invalid IDs, excessive search limits, unavailable downstreams, unauthorized access, cancellation, duplicate calls, and model responses without tool use.
  - **Check:** Tool errors are structured, safe, logged, and recoverable by the assistant.

## 7B. LiveKit checklist

- [ ] Preserve one assistant brain.
  - **Why:** Text and voice should not have separate prompts, tools, or authorization rules.
  - **How:** Make the LiveKit agent reuse the same assistant policy and MCP tools. Add `apps/voice-agent` only if the agent must run as an independently deployed worker/process.
  - **Check:** The same project question produces equivalent grounded information in text and voice.

- [ ] Issue scoped LiveKit tokens server-side.
  - **Why:** API secrets cannot be shipped to the browser and room access must be limited.
  - **How:** Authenticate the user, create short-lived participant tokens for one room/session, and avoid logging tokens.
  - **Check:** Expired or wrong-room tokens fail and no LiveKit secret appears in browser assets.

- [ ] Implement the complete voice state model.
  - **Why:** Voice sessions fail in more ways than a normal form submission.
  - **How:** Represent `idle`, `requesting-permission`, `connecting`, `listening`, `thinking`, `speaking`, `reconnecting`, and `error`. Provide mute, disconnect, retry, and text fallback.
  - **Check:** Every state is visible, accessible, and testable without a real production call.

- [ ] Implement interruption and cleanup.
  - **Why:** Natural voice UX requires the user to interrupt, and media resources must not leak after navigation.
  - **How:** Use LiveKit’s turn detection/interruption primitives; stop playback when the user speaks; release tracks/listeners on disconnect or unmount.
  - **Check:** Interrupting stops speech promptly and leaving the page turns off the microphone indicator.

- [ ] Make transcripts authoritative enough for the user.
  - **Why:** Audio-only responses are difficult to review and inaccessible to some users.
  - **How:** Render partial/final transcript states distinctly, preserve the final transcript in conversation history, and allow switching to text.
  - **Check:** A completed voice turn can be understood without replaying audio.

- [ ] Test real-world device/network scenarios.
  - **Why:** Permission denial, device changes, background noise, and reconnects are normal conditions.
  - **How:** Test denied permission, no input device, slow connection, disconnect/reconnect, user interruption, rapid start/stop, tab navigation, and text fallback.
  - **Check:** Failures never trap the user or leave an active media session behind.

### Exit criteria

- [ ] AI answers project questions using visible, authorized, read-only MCP tool calls.
- [ ] Voice reuses the text assistant’s policies and tools.
- [ ] Permission, interruption, reconnect, transcript, and cleanup behavior pass.

---

# Stage 8 — Production hardening and optional microfrontend exercise

## Goal

Prove production readiness first. Treat microfrontends as a measured migration exercise, not the default architecture.

## 8A. Production hardening checklist

- [ ] Add structured observability.
  - **Why:** Distributed failures across shell, API, AI provider, MCP, and LiveKit cannot be diagnosed from browser errors alone.
  - **How:** Use consistent request/session IDs, structured logs, latency/error metrics, and traces across downstream calls. Never record secrets, tokens, full prompts, or sensitive tool results by default.
  - **Check:** One failed user request can be followed across components using a correlation ID.

- [ ] Define service-level indicators and budgets.
  - **Why:** “Fast” and “reliable” need measurable definitions.
  - **How:** Track page/navigation performance, GraphQL latency/error rate, assistant time-to-first-token/completion rate, subscription reconnects, and voice connection/turn latency.
  - **Check:** A dashboard or repeatable report shows the chosen indicators.

- [ ] Run security and abuse reviews.
  - **Why:** GraphQL, model endpoints, tools, and voice tokens each expand the attack surface.
  - **How:** Review authorization, object-level access, query cost, rate limits, CORS/CSRF as applicable, SSRF in backend adapters, prompt injection/tool misuse, token storage, dependency vulnerabilities, and log redaction.
  - **Check:** High-risk findings have fixes or explicit accepted-risk records.

- [ ] Add persisted GraphQL operations when the API becomes private/production-facing.
  - **Why:** A safelist reduces arbitrary query execution and can reduce request size.
  - **How:** Generate persisted documents from client operations, deploy the manifest with the API, and reject unknown operations in production after rollout compatibility is proven.
  - **Check:** Known operations succeed and an unknown arbitrary operation is rejected in production mode.

- [ ] Create a deployment and rollback runbook.
  - **Why:** The shell and API may deploy independently and can temporarily run different contract versions.
  - **How:** Use backward-compatible schema evolution, health/readiness checks, environment validation, migration ordering, smoke tests, rollback steps, and separate artifacts for logs/test reports.
  - **Check:** A clean staging deployment and rollback can be performed using the written steps.

- [ ] Run the final critical-path suite.
  - **Why:** Production confidence comes from layered checks, not unit-test volume.
  - **How:** Cover project browse/filter/open, status update including rollback, live activity reconnect, assistant tool answer/cancel/error, and voice permission/connect/interruption/cleanup.
  - **Check:** The suite passes in a production-like environment without relying on test order.

## 8B. Microfrontend decision gate

Do not split unless at least one of these is true:

- separate teams need independent ownership and release schedules;
- project routes need independent deployment or scaling;
- build/release coupling is a measured bottleneck;
- the exercise itself is an explicit learning objective and the trade-offs will be documented.

Keep the monolith if:

- one person/team owns the application;
- `/projects` and `/projects/[id]` are navigated together frequently;
- the assistant is tightly embedded in project details;
- independent deployment has no operational value.

### Optional checklist

- [ ] Measure and document the reason for extraction.
  - **Why:** Microfrontends add routing, deployment, versioning, asset, observability, and UX complexity.
  - **How:** Record current build times, ownership friction, release coupling, and expected improvement in an ADR.
  - **Check:** The ADR contains a measurable success condition and a rollback plan.

- [ ] Extract one route-aligned vertical slice first.
  - **Why:** Next.js Multi-Zones work best when each zone owns a distinct path collection.
  - **How:** Move `/projects/*` into `apps/projects`; keep the default shell responsible for remaining paths; configure unique assets and routing rewrites.
  - **Check:** Each path has exactly one owning zone and can deploy independently.

- [ ] Preserve the user experience across zone boundaries.
  - **Why:** Next.js navigation between zones is a hard navigation, so tightly coupled pages should stay together.
  - **How:** Keep frequently co-navigated project pages in the same zone; use ordinary anchors across zones; preserve authentication, design tokens, correlation IDs, error handling, and return URLs.
  - **Check:** Refresh, deep links, browser navigation, authentication, and static assets work in local and deployed environments.

- [ ] Do not extract the assistant panel blindly.
  - **Why:** A project-scoped side panel shares page context and interaction state, making it a poor route-level zone unless it becomes an independently owned application.
  - **How:** First extract assistant domain logic behind a stable package/service boundary. Create `apps/assistant` only if it owns independent routes and deployment—not merely because it is visually separable.
  - **Check:** The proposed split reduces measured coupling instead of replacing code coupling with runtime coupling.

- [ ] Compare before and after.
  - **Why:** The exercise is valuable only if its trade-offs are understood.
  - **How:** Compare build/deploy time, bundle duplication, navigation behavior, failure isolation, local development, test complexity, and operational overhead.
  - **Check:** Keep or revert the split based on the ADR’s success criteria.

### Final exit criteria

- [ ] The system is observable, secured for its exposure, deployable, and reversible.
- [ ] Microfrontend adoption, if any, is justified by evidence rather than trend.
- [ ] The developer can explain the architecture, its alternatives, and its trade-offs.

---

## 6. Recommended implementation sequence by pull request

This sequence keeps pull requests small and produces working checkpoints:

1. Product acceptance criteria, domain vocabulary, and ADRs
2. Workspace scripts, TypeScript/lint alignment, clean ignore rules
3. CI with frozen install and root quality commands
4. Dashboard layout and real UI foundation
5. Project-list fixtures and all list states
6. Project detail, activity fixture, and status-edit interaction
7. Shell behavior tests with MSW
8. API runtime, health endpoint, and first `projects` query
9. API service/repository boundary and API tests
10. GraphQL Codegen for server and shell
11. Apollo App Router integration and project-list migration
12. Detail/activity migration and optimistic status mutation
13. UI package extraction, real Storybook stories, accessibility checks
14. Polling baseline followed by SSE activity subscription
15. Text assistant streaming with cancellation and operational limits
16. Read-only MCP tools and visible tool-call UI
17. LiveKit token/session flow, voice states, interruption, and cleanup
18. Observability, security hardening, persisted operations, staging runbook
19. Optional microfrontend ADR and one route-aligned extraction experiment

---

## 7. Verification command matrix

Finalize exact script names during Stage 1. The repository should eventually support a matrix similar to this:

| Concern | Root command | Expected behavior |
| --- | --- | --- |
| Development | `pnpm dev` | Turbo starts shell and API persistent dev tasks |
| Build | `pnpm build` | Turbo runs applicable dependency-aware production builds |
| Lint | `pnpm lint` | All workspaces with lint scripts pass |
| Type safety | `pnpm typecheck` | Shell, API, and UI compile-check without emitting |
| Tests | `pnpm test` | Deterministic non-watch unit/integration tests run |
| E2E | `pnpm test:e2e` | Playwright runs critical journeys against production-like services |
| Codegen | `pnpm codegen` | Server/client artifacts regenerate from the schema |
| Contract drift | `pnpm codegen:check` | CI fails if generated output/schema artifacts are stale |
| Clean install | `pnpm install --frozen-lockfile` | Installs exactly the committed dependency graph |

Also verify after major stages:

- `git status` is clean after generated tasks;
- no secret appears in browser bundles or logs;
- API failure and latency can be simulated locally;
- keyboard-only and narrow-screen behavior are tested;
- production build starts successfully, not merely compiles.

---

## 8. Research-backed rationale and primary references

These sources were checked while preparing this roadmap. Re-check current version-specific documentation when implementing a later stage because this project intentionally uses fast-moving technologies.

### Monorepo and builds

- [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) — workspace conventions and lockfile-based package relationships.
- [Turborepo: Package and Task Graphs](https://turborepo.dev/docs/core-concepts/package-and-task-graph) — how internal dependencies become an execution graph.
- [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) — deterministic inputs/outputs and cache behavior.
- [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) — JIT versus compiled internal-package trade-offs.

### Next.js and frontend architecture

- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist) — Server Components, caching, streaming, error UI, accessibility, and production checks.
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — keep server rendering as the default and add client boundaries for interaction/browser APIs.
- [Apollo Client: Next.js App Router integration](https://www.apollographql.com/docs/react/integrations/nextjs) — maintained integration for RSC, SSR, streaming, and client cache hydration.
- [Next.js testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest) — unit/component scope and the limitation around async Server Components.
- [Playwright best practices](https://playwright.dev/docs/best-practices) — test user-visible behavior, resilient locators, and isolation.
- [W3C WCAG 2.2](https://www.w3.org/TR/wcag/) — accessibility conformance baseline.

### GraphQL

- [GraphQL Code Generator client preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client) — typed operations, fragment masking, and persisted-document support.
- [GraphQL Yoga schema guidance](https://the-guild.dev/graphql/yoga-server/docs/features/schema) — schema construction and server setup.
- [GraphQL Yoga subscriptions](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions) — SSE default, reconnection considerations, and distributed pub/sub requirements.
- [GraphQL Yoga production guidance](https://the-guild.dev/graphql/yoga-server/docs/prepare-for-production) — operation limits, persisted operations, caching, and error reporting.
- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html) — input validation, authorization, query limiting, rate limiting, and secure production configuration.

### MCP, voice, and microfrontends

- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/) — current stable TypeScript SDK and typed tool schemas.
- [MCP authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) — audience-bound tokens, protected-resource discovery, and no token passthrough.
- [MCP tools specification](https://modelcontextprotocol.io/specification/draft/server/tools) — tool schemas, visibility, safety, and human-in-the-loop guidance.
- [LiveKit Agents introduction](https://docs.livekit.io/agents/) — WebRTC frontend/agent architecture and realtime voice pipeline.
- [LiveKit turn and interruption handling](https://docs.livekit.io/agents/logic/turns/) — turn detection, interruptions, and conversation-history behavior.
- [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones) — path ownership, routing, asset prefixes, independent deployment, and hard navigation across zones.

---

## 9. Final architectural test

Before adding any new package, app, service, or protocol, answer these questions:

1. Which current user behavior requires it?
2. Which workspace owns it?
3. What simpler option was considered?
4. How will it be tested?
5. What new failure mode does it introduce?
6. How will it be observed in production?
7. How can it be removed or rolled back?

If those answers are unclear, the project is not ready for that addition yet.
