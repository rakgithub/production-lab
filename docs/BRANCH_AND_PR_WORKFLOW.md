# Branch and Pull Request Workflow

## Purpose

This guide implements the **“Establish branch/PR quality rules”** item from [PROJECT_IMPLEMENTATION_PLAN.md](../PROJECT_IMPLEMENTATION_PLAN.md).

Use it for every change to this repository: documentation, tooling, UI, API, GraphQL, tests, and infrastructure.

The goal is simple: a reviewer should understand **what changed, why it changed, how it was checked, and what could be affected** without reverse-engineering the code.

## Rules at a glance

1. One branch and pull request should have one clear purpose.
2. Start from an up-to-date `main` branch.
3. Run the checks relevant to the change before opening a PR.
4. Record the commands and manual verification in the PR.
5. Add before/after screenshots for visual UI changes.
6. Create or update an ADR for an architectural decision.
7. Do not commit secrets, dependency folders, caches, logs, or generated build output.

---

## 1. Branch naming

Use this format:

```text
<type>/<short-kebab-case-description>
```

Allowed types:

| Type | Use for | Example |
| --- | --- | --- |
| `feature` | New product behavior | `feature/projects-list` |
| `fix` | Incorrect existing behavior | `fix/status-update-rollback` |
| `chore` | Tooling, dependencies, cleanup, CI | `chore/add-ci-workflow` |
| `docs` | Documentation only | `docs/branch-pr-workflow` |
| `refactor` | Internal code improvement with unchanged behavior | `refactor/project-service-boundary` |
| `test` | Test-only work | `test/project-list-states` |
| `security` | Security hardening | `security/graphql-query-limits` |

Good names describe the outcome:

```text
feature/project-search-url-state
fix/activity-reconnect-duplicates
chore/remove-storybook-tutorial-assets
```

Avoid vague names:

```text
feature/new-stuff
fix/bugs
test
branch1
```

### Create a branch

First make sure you are not accidentally carrying unrelated work. Inspect the working tree:

```bash
git status
```

When the working tree is clean, update `main` and create a focused branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/projects-list
```

`--ff-only` prevents Git from creating an unexpected merge commit while updating your local `main` branch.

If you intentionally have unfinished work, do **not** switch branches blindly. Commit it as a focused change or use Git’s stash only after confirming exactly what it contains.

---

## 2. Keep the pull request focused

A pull request should ideally answer one sentence:

> This PR does ___ so that ___ .

Examples:

```text
This PR adds URL-backed project filters so that users can share a filtered project view.

This PR adds the GraphQL project query so that the shell can replace fixture data.

This PR adds CI checks so that every PR is validated on a clean machine.
```

Split work when it has separate review questions.

| Keep together | Split apart |
| --- | --- |
| Project list UI, its tests, and its Storybook states | Project list UI and a new GraphQL server runtime |
| A CI workflow and the scripts it invokes | CI workflow and unrelated UI cleanup |
| A status mutation and its optimistic rollback test | A status mutation and a LiveKit voice integration |

Before committing, inspect the exact diff:

```bash
git diff
git status --short
```

If unrelated files appear, remove them from the PR before requesting review.

---

## 3. Local verification commands

Run the checks that apply to your change. The root commands use Turbo and will run the matching workspace scripts.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Which command to run

| Change | Minimum checks | Extra manual check |
| --- | --- | --- |
| Markdown/documentation only | `git diff --check` | Verify all referenced paths/links are correct |
| UI component | `pnpm lint`, `pnpm typecheck`, `pnpm test` | Storybook; keyboard interaction; narrow viewport |
| Next.js route/page | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Loading, empty, error, and success states |
| GraphQL/API | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Health endpoint; validation/not-found/downstream-error behavior |
| Shared UI package | `pnpm lint`, `pnpm typecheck`, `pnpm test` | `pnpm --filter @repo/ui build-storybook` |
| CI/tooling | `git diff --check` | Validate the changed config’s syntax; confirm the commands exist |
| Dependency update | `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Review `pnpm-lock.yaml` changes intentionally |

### Project-specific notes

- Do not write “tests pass” unless the actual command completed successfully.
- If a command is intentionally unavailable because a workspace is not implemented yet, write that clearly in the PR instead of hiding or faking a success.
- In this project, the default Next.js build uses Turbopack. If a local desktop sandbox blocks its internal port, you may use this diagnostic command to validate the application code:

  ```bash
  pnpm --filter shell exec next build --webpack
  ```

  CI must still run the normal root command:

  ```bash
  pnpm build
  ```

  Do not change the production build script to webpack solely to work around a local sandbox limitation.

### Verify no generated artifacts are included

Run:

```bash
git status --short
git check-ignore -v .turbo apps/shell/.next packages/ui/storybook-static
```

Expected result: caches/output are ignored and do not appear as files to commit. Typical generated artifacts include:

```text
node_modules/
.turbo/
.next/
coverage/
storybook-static/
playwright-report/
test-results/
blob-report/
*.log
```

Never add `.env` files containing secrets. Update an `.env.example` file instead when configuration changes.

---

## 4. Add a pull request template

Create this file once:

```text
.github/pull_request_template.md
```

GitHub automatically inserts it into the description of new pull requests.

Use this content:

````md
## What changed?

<!-- Briefly describe the feature, fix, cleanup, or documentation change. -->

## Why?

<!-- State the user problem, bug, engineering need, or learning goal. -->

## Scope

- [ ] Shell UI
- [ ] API / GraphQL
- [ ] Shared UI package
- [ ] Tests
- [ ] CI / tooling
- [ ] Documentation
- [ ] Architecture

## Verification

Commands run:

```text
<!-- Example:
pnpm lint
pnpm typecheck
pnpm test
pnpm build
-->
```

Manual checks:

- [ ] Success behavior checked
- [ ] Loading, empty, and error states checked where applicable
- [ ] Keyboard interaction checked where applicable
- [ ] Screenshots added for visual UI changes, or not applicable

## Screenshots

Before: <!-- Screenshot, GIF, or “Not applicable” -->

After: <!-- Screenshot, GIF, or “Not applicable” -->

## Architecture decision

- [ ] No architecture change
- [ ] ADR added or updated: <!-- Link to docs/adr/... -->

## Author checklist

- [ ] This PR has one focused purpose.
- [ ] Tests were added or updated where behavior changed.
- [ ] No secrets, logs, build output, cache, or `node_modules` files are included.
- [ ] Documentation was updated where needed.
````

### Test the template

1. Commit and push the template.
2. Open any new pull request in GitHub.
3. Confirm the description is pre-filled.
4. Fill it in with facts—not checked boxes for work that was not performed.

---

## 5. Screenshot workflow for UI changes

Screenshots are required when the visible UI changes. They make reviews faster and preserve a record of the intended result.

### Local workflow

Start the shell:

```bash
pnpm --filter shell dev
```

Capture at least:

- the normal/success state;
- a narrow viewport if the layout is responsive;
- a loading, empty, or error state when the PR changes it;
- keyboard focus or dialog behavior when that interaction is central to the PR.

Attach the images directly to the GitHub PR description by dragging them into the **Before** and **After** sections.

For non-visual changes—such as CI, package cleanup, or a resolver-only change—write:

```text
Not applicable — no user-visible UI changed.
```

---

## 6. Architecture Decision Records (ADRs)

Create an ADR when the change affects a long-lived boundary, technology choice, deployment model, security model, or data-flow rule.

Examples that require an ADR in this project:

- keeping `apps/api` as a separate GraphQL BFF;
- choosing GraphQL Yoga and Apollo Client;
- choosing SSE versus WebSockets for activity subscriptions;
- deciding where MCP runs and how it is authorized;
- adding `apps/voice-agent` as a separate process;
- splitting into Next.js Multi-Zones.

Examples that do not require an ADR:

- changing a button’s padding;
- adding a project-list test;
- fixing a typo;
- upgrading a patch dependency without a behavior change.

### Create the ADR directory and first record

```bash
mkdir -p docs/adr
```

Use a sequential, zero-padded number:

```text
docs/adr/0001-keep-separate-graphql-api.md
docs/adr/0002-use-apollo-client-in-shell.md
```

### ADR template

```md
# ADR 0001: Keep a separate GraphQL API

## Status

Accepted

## Context

Explain the product and technical problem. Include constraints.

## Decision

State the chosen approach precisely.

## Alternatives considered

- Alternative A — why it was not selected
- Alternative B — why it was not selected

## Consequences

List benefits, costs, new failure modes, and follow-up work.

## Verification

Explain how the decision will be proven or revisited.
```

Keep ADRs short. Their value is recording the reason and trade-off, not producing a long design document.

---

## 7. Commit and push workflow

Review exactly what will be committed:

```bash
git status --short
git diff
```

Stage only the relevant files:

```bash
git add apps/shell/app/projects/page.tsx
git add apps/shell/app/projects/page.test.tsx
git add packages/ui/src/table/project-table.tsx
```

Avoid this on a mixed working tree:

```bash
git add .
```

Inspect staged content before committing:

```bash
git diff --staged
```

Use an imperative commit message that matches the branch purpose:

```bash
git commit -m "feat(shell): add project list filters"
git push -u origin feature/projects-list
```

Suggested commit prefixes:

```text
feat: new behavior
fix: bug fix
docs: documentation only
test: tests only
refactor: code structure without behavior change
chore: tooling, dependency, or maintenance work
ci: workflow changes
```

Open a pull request with GitHub’s web interface or GitHub CLI:

```bash
gh pr create --base main --fill
```

`--fill` uses the commit message/branch information. Replace or complete the PR description with the pull request template before submitting it for review.

---

## 8. Configure GitHub branch protection

Do this after the CI workflow is reliably passing.

1. Open the repository on GitHub.
2. Go to **Settings → Rules → Rulesets**.
3. Create a ruleset targeting the `main` branch.
4. Require the `CI / quality` status check to pass before merge.
5. Optionally require one approving review when working with collaborators.
6. Restrict force pushes to `main`.
7. Keep administrators subject to the rules if you want the workflow applied consistently to everyone.

For a solo project, the minimum useful rule is:

```text
main cannot be merged into unless CI / quality passes.
```

Do not enable a required check until the workflow is stable. Otherwise every change becomes blocked by known placeholder scripts rather than meaningful failures.

---

## 9. Definition of Done before opening a PR

- [ ] The branch name describes one focused purpose.
- [ ] `git diff` contains no unrelated changes.
- [ ] Relevant local commands were run and their results are written in the PR.
- [ ] UI screenshots are attached, or marked not applicable.
- [ ] Loading, error, empty, success, and keyboard checks are covered when the feature needs them.
- [ ] An ADR is linked if a long-lived architecture decision changed.
- [ ] Generated files, logs, caches, dependencies, and secrets are absent.
- [ ] The PR description explains the change without requiring a reviewer to inspect every file first.
