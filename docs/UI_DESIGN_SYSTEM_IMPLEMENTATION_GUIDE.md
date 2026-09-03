# Shared UI Design System Implementation Guide

**Repository:** `production-lab`  
**Scope:** `packages/ui`, Storybook, shadcn/ui, Tailwind CSS, and consumption from `apps/shell`  
**Research baseline:** September 2026

## 1. Purpose

This document explains how a human developer should turn the existing `packages/ui` workspace into a maintainable shared design system.

It covers:

- why this repository should use shadcn/ui;
- which shadcn foundation to choose in 2026;
- how Storybook, Tailwind, Base UI, and `packages/ui` fit together;
- the target directory and package structure;
- exact implementation steps and commands;
- how to write component stories and tests;
- how the Next.js shell should consume shared components;
- the quality rules required before a component is considered production-ready.

This is an implementation guide, not an instruction to install every available component. Add components only when a product screen needs them.

Commands in this guide run from the repository root unless stated otherwise.

---

## 2. Decision summary

Use the following stack:

| Responsibility | Decision |
| --- | --- |
| Component source and recipes | shadcn/ui |
| Accessible interactive primitives | Base UI |
| Styling | Tailwind CSS v4 with semantic CSS variables |
| Component ownership | `packages/ui` |
| Component development and documentation | Storybook with React and Vite |
| Component behavior tests | Storybook Vitest addon and `play` functions |
| Accessibility checks | Storybook a11y addon |
| Visual regression | Chromatic when CI credentials are available |
| Icons | One library selected in `components.json`, initially Lucide |

Recommended shadcn choices for this dashboard:

```text
Primitive base: Base UI
Style: Nova
Base color: Neutral
Theming: CSS variables
Icon library: Lucide
RSC support: Enabled
TypeScript: Enabled
```

Base UI became the default for new shadcn projects in July 2026. Radix remains supported, but this repository is starting a new design system rather than maintaining an existing Radix installation. See [Base UI as the shadcn default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default).

### Why shadcn/ui

shadcn/ui is not a traditional opaque component dependency. It distributes component source code into the repository. The team then owns, reviews, tests, and changes that source. This fits an internal design-system package because:

- component behavior is based on accessible primitives;
- styling is Tailwind-native;
- component code remains visible and customizable;
- the shared package is not forced to wrap another opinionated visual framework;
- the CLI supports monorepos and can route shared primitives into `packages/ui`;
- components can evolve with the product instead of being overridden from outside.

The trade-off is ownership: upstream shadcn changes do not silently update local component source. The team must review diffs and deliberately adopt improvements. That is desirable for a controlled design system, but it requires maintenance discipline. See the [shadcn introduction](https://ui.shadcn.com/docs) and [monorepo guidance](https://ui.shadcn.com/docs/monorepo).

### Why Base UI underneath shadcn

Base UI supplies headless behavior for difficult controls such as dialogs, popovers, menus, selects, and comboboxes. It handles much of the keyboard navigation, focus management, and ARIA behavior while leaving styling to Tailwind. See the [Base UI overview](https://base-ui.com/react/overview/about) and [accessibility guidance](https://base-ui.com/react/overview/accessibility).

Use native HTML elements for simple controls whenever they satisfy the UX. Use a Base UI-backed shadcn component when the interaction has complex focus, popup, or keyboard behavior.

### Why Storybook

Storybook is not the component library. It is the isolated workshop and quality surface for the component library.

```text
shadcn component source
        ↓
packages/ui owns and exports it
        ↓
Storybook renders its states and runs component checks
        ↓
apps/shell composes it into product features
```

The repository already uses Storybook with React/Vite. Current Storybook guidance treats stories as executable component test cases, and the Vitest addon can run them in a real browser and in CI. See [Storybook testing](https://storybook.js.org/docs/writing-tests/index) and the [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index).

---

## 3. Current repository assessment

The following foundations already exist:

- `packages/ui` is a pnpm workspace named `@repo/ui`;
- Storybook 10 is installed with the React/Vite framework;
- the Storybook docs, a11y, Vitest, MCP, and Chromatic addons are installed;
- browser-based Storybook tests are configured through Vitest and Playwright;
- `packages/ui` has strict TypeScript settings;
- `apps/shell` already consumes `@repo/ui`;
- `apps/shell` already uses Tailwind CSS v4;
- `storybook-static/` is already ignored by Git.

The main gaps are:

- Storybook does not import shared Tailwind styles;
- `packages/ui` does not yet own the design tokens used by the shell;
- there is no shadcn `components.json` configuration;
- the package has only a minimal unstyled button;
- package exports do not expose component and style subpaths;
- no component acceptance standard is documented;
- Storybook is not yet an explicit CI quality gate.

Do not reinstall Storybook from scratch. Adapt the existing configuration.

---

## 4. Ownership boundaries

### Put these in `packages/ui`

These components are product-agnostic building blocks:

```text
Button
Badge
Card
Input
Label
Select
Dialog
DropdownMenu
Table
Tabs
Tooltip
Skeleton
Spinner
EmptyState
```

They may understand visual concepts such as `variant="destructive"`, `size="sm"`, or `aria-invalid`, but they must not understand projects, dashboard queries, GraphQL, routes, or backend data.

### Keep these in `apps/shell/features/**/ui`

These components express product meaning:

```text
DashboardOverview
DashboardStatusCard
ProjectListView
ProjectFilters
ProjectStatusEditor
ProjectActivityFeed
```

They compose components from `@repo/ui` and own feature-specific wording, data shapes, and interactions.

### Dependency rule

```text
apps/shell feature UI
        ↓ may import
@repo/ui components

@repo/ui
        ✕ must not import
apps/shell, Next.js routes, GraphQL operations, or project models
```

Avoid importing `next/link`, `next/image`, `next/navigation`, or server-only code into `packages/ui`. A generic component may accept a renderable child, URL, or adapter prop, but Next.js behavior belongs to the app.

---

## 5. Target structure

```text
packages/ui/
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── src/
│   ├── components/
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   ├── button.stories.tsx
│   │   │   ├── button.test.tsx
│   │   │   └── index.ts
│   │   ├── badge/
│   │   │   ├── badge.tsx
│   │   │   ├── badge.stories.tsx
│   │   │   ├── badge.test.tsx
│   │   │   └── index.ts
│   │   └── card/
│   │       ├── card.tsx
│   │       ├── card.stories.tsx
│   │       ├── card.test.tsx
│   │       └── index.ts
│   │   └── ...
│   ├── hooks/
│   │   └── ...                 # Only reusable UI hooks
│   ├── lib/
│   │   └── utils.ts            # Class-name composition helper
│   ├── styles/
│   │   └── globals.css         # Tailwind import, tokens and base styles
│   └── index.ts                # Optional convenience barrel
├── components.json
├── eslint.config.mjs
├── package.json
├── tsconfig.json
└── vitest.config.js

apps/shell/
├── app/
│   └── globals.css             # Imports shared UI styles
├── components.json             # Routes shadcn shared primitives to @repo/ui
└── features/
    ├── dashboard/ui/
    └── projects/ui/
```

Prefer explicit subpath imports in application code:

```ts
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
```

An optional root barrel can remain for compatibility, but explicit subpaths make ownership and dependency boundaries clearer and reduce accidental coupling to the entire package.

---

## 6. Implementation checklist

### Phase 0 — Protect the starting point

- [ ] Confirm the working tree contains only intentional changes.
  - **Why:** shadcn writes source files and can change CSS and dependencies. A clean baseline makes every generated change reviewable.
  - **How:** Run `git status --short`. Commit or intentionally preserve existing work before invoking the CLI.
  - **Check:** The developer can distinguish pre-existing work from shadcn-generated changes.

- [ ] Record the baseline quality results.
  - **Why:** A migration should not hide an existing failure or introduce a new one without explanation.
  - **How:** Run:

    ```bash
    pnpm --filter @repo/ui lint
    pnpm --filter @repo/ui typecheck
    pnpm --filter @repo/ui test
    pnpm --filter @repo/ui build-storybook
    pnpm --filter shell build
    ```

  - **Check:** Save any existing failures in the pull-request description before changing the design system.

### Phase 1 — Define the package API before generating components

- [ ] Add package-local import aliases to `packages/ui/package.json`.
  - **Why:** shadcn-generated files frequently import components and utilities from one another. Stable package-local aliases prevent brittle deep relative paths.
  - **How:** Add an `imports` map shaped like:

    ```json
    {
      "imports": {
        "#components/*": "./src/components/*/index.ts",
        "#hooks/*": "./src/hooks/*.ts",
        "#lib/*": "./src/lib/*.ts"
      }
    }
    ```

    `packages/ui/tsconfig.json` already uses `moduleResolution: "Bundler"`. Explicitly enable `resolvePackageJsonImports` if resolution does not work in all tools.

  - **Check:** TypeScript resolves an import such as `#lib/utils` from within `packages/ui`.

- [ ] Add public subpath exports to `packages/ui/package.json`.
  - **Why:** `apps/shell` needs stable, documented entry points. It should not import private files such as `@repo/ui/src/components/button`.
  - **How:** Evolve the existing exports toward:

    ```json
    {
      "exports": {
        ".": "./src/index.ts",
        "./globals.css": "./src/styles/globals.css",
        "./components/*": "./src/components/*/index.ts",
        "./hooks/*": "./src/hooks/*.ts",
        "./lib/*": "./src/lib/*.ts"
      }
    }
    ```

  - **Check:** The shell can typecheck an import from `@repo/ui/components/button` without referencing `src`.

- [ ] Keep runtime dependencies in the UI workspace that uses them.
  - **Why:** pnpm uses strict workspace boundaries. A dependency available in the shell is not automatically a declared dependency of `@repo/ui`.
  - **How:** Let the shadcn CLI add the selected primitive and helper dependencies to `packages/ui`. Keep React in `peerDependencies` and also in `devDependencies` for local Storybook development. Keep Storybook and Tailwind build tools in `devDependencies`.
  - **Check:** `pnpm --filter @repo/ui typecheck` works without relying on undeclared dependencies from another workspace.

### Phase 2 — Configure shadcn for the existing monorepo

- [ ] Initialize the supported Next.js application, not the shared UI package.
  - **Why:** `shadcn init` verifies that its working directory contains a supported application framework. `apps/shell` is the Next.js application; `packages/ui` is intentionally a framework-neutral library for reusable source and Storybook. Therefore the CLI cannot detect a framework when it is run with `-c packages/ui`.
  - **How:** After creating a clean Git baseline, initialize from the shell workspace:

    ```bash
    pnpm dlx shadcn@latest init -c apps/shell -b base
    ```

    Select Nova, neutral, CSS variables, Lucide, TypeScript, and React Server Component support when prompted. This creates the initial shell-side `components.json`, utility, theme configuration, and required base dependencies. Do not add components yet.

    Do not run `init --monorepo`: that command scaffolds a brand-new repository and is not appropriate for this existing monorepo.

  - **Check:** `apps/shell/components.json` exists, `pnpm dlx shadcn@latest info -c apps/shell` succeeds, and every generated change is understood before continuing.

- [ ] Configure `packages/ui/components.json` for package-local aliases.
  - **Why:** The CLI needs to know where shared components, hooks, utilities, and styles belong.
  - **How:** The effective configuration should follow this shape, adjusted to the exact style identifier emitted by the current CLI:

    ```json
    {
      "$schema": "https://ui.shadcn.com/schema.json",
      "style": "base-nova",
      "rsc": true,
      "tsx": true,
      "tailwind": {
        "config": "",
        "css": "src/styles/globals.css",
        "baseColor": "neutral",
        "cssVariables": true
      },
      "iconLibrary": "lucide",
      "aliases": {
        "components": "#components",
        "ui": "#components",
        "hooks": "#hooks",
        "lib": "#lib",
        "utils": "#lib/utils"
      }
    }
    ```

    Tailwind v4 intentionally uses an empty `tailwind.config` value. CSS variables are recommended because they expose semantic tokens such as `background`, `foreground`, and `primary`. See the current [`components.json` reference](https://ui.shadcn.com/docs/components-json).

  - **Check:** `packages/ui/components.json` exists and its aliases match the `imports` and `exports` already defined in `packages/ui/package.json`.

- [ ] Add a matching `apps/shell/components.json`.
  - **Why:** When `shadcn add` runs from the shell, the CLI must route reusable primitives to `@repo/ui` and app-specific blocks to the shell.
  - **How:** Keep the same style, icon library, base color, and CSS-variable choice as `packages/ui`. Update the shell-generated aliases with this intent:

    ```json
    {
      "aliases": {
        "components": "@/components",
        "hooks": "@/hooks",
        "lib": "@/lib",
        "ui": "@repo/ui/components",
        "utils": "@repo/ui/lib/utils"
      }
    }
    ```

    During initialization, `tailwind.css` may temporarily point to `app/globals.css`. In Phase 3, after the shared stylesheet exists, change it to `../../packages/ui/src/styles/globals.css`, as shown by the official monorepo pattern. Do not run `shadcn add` until that Phase 3 change is complete.

  - **Check:** Both `components.json` files agree on style, icon library, base color, and CSS variables.

### Phase 3 — Establish one Tailwind and token source

- [ ] Create `packages/ui/src/styles/globals.css` as the shared visual contract.
  - **Why:** Storybook and the shell must render the same component with the same colors, radius, typography, border, focus ring, and dark-mode behavior.
  - **How:** Use the theme generated in `apps/shell/app/globals.css` by the supported-app initialization as the initial reference, then move and adapt the shared design-system tokens into this package stylesheet. It should contain:

    ```css
    @import "tailwindcss";

    :root {
      /* Light semantic tokens */
    }

    .dark {
      /* Dark semantic tokens */
    }

    @theme inline {
      /* Map semantic CSS variables to Tailwind utilities */
    }
    ```

    Use semantic names such as `--background`, `--foreground`, `--primary`, `--muted`, `--destructive`, `--border`, and `--ring`. Do not create product-specific tokens such as `--apollo-project-card`.

    Tailwind v4 explicitly supports sharing theme-variable CSS from a monorepo package. See [Tailwind theme variables](https://tailwindcss.com/docs/theme).

  - **Check:** A token change produces the same result in Storybook and the shell.

- [ ] Make Tailwind discover UI-package component classes.
  - **Why:** Tailwind scans source files to decide which utilities to generate. Workspace source outside the normal application scan can otherwise produce components that work in Storybook but lose styling in the shell build.
  - **How:** Use Tailwind v4 automatic discovery and add an explicit `@source` for `packages/ui/src` from the shell stylesheet if the package is not discovered. Paths are relative to the stylesheet. See [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).
  - **Check:** Build the shell in production mode and verify uncommon component variants still have CSS.

- [ ] Import the shared stylesheet once in the shell.
  - **Why:** Multiple Tailwind roots or repeated preflight imports can create ordering differences and duplicated base styles.
  - **How:** Make `apps/shell/app/globals.css` import the exported `@repo/ui/globals.css`, then keep only shell-specific global rules in the shell stylesheet. Import the shell global stylesheet once from `app/layout.tsx`.
  - **Check:** Browser dev tools show one coherent token set and no duplicate preflight blocks.

- [ ] Configure Tailwind v4 for Storybook's Vite builder.
  - **Why:** The shell uses Next.js/PostCSS, while Storybook uses Vite. Storybook needs its own CSS compilation path.
  - **How:** Add Tailwind and the first-party Vite integration to `packages/ui`:

    ```bash
    pnpm --filter @repo/ui add -D tailwindcss @tailwindcss/vite
    ```

    Add `tailwindcss()` through Storybook's `viteFinal` hook, and import the shared stylesheet from `.storybook/preview.ts`:

    ```ts
    import "../src/styles/globals.css";
    ```

    Tailwind recommends its Vite plugin for Vite-based tooling. See [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite) and the [Storybook Tailwind recipe](https://storybook.js.org/recipes/tailwindcss/).

  - **Check:** A Storybook story renders Tailwind spacing, colors, hover styles, focus rings, and dark tokens correctly.

### Phase 4 — Add the first components safely

- [ ] Preview CLI changes before writing files.
  - **Why:** shadcn source becomes repository-owned code, and CLI versions can evolve.
  - **How:** Use the current CLI's dry-run mode:

    ```bash
    pnpm dlx shadcn@latest add button card badge -c apps/shell --dry-run
    ```

  - **Check:** The preview routes primitives to `packages/ui/src/components`, not to a duplicate shell UI directory.

- [ ] Replace the existing sample Button with the shadcn Button.
  - **Why:** Two Button implementations immediately create inconsistent variants and imports.
  - **How:** Add the initial primitives:

    ```bash
    pnpm dlx shadcn@latest add button card badge -c apps/shell
    ```

    Migrate imports to `@repo/ui/components/button`. Remove the old `packages/ui/src/button` implementation only after all imports and stories use the new component.

  - **Check:** There is exactly one shared Button implementation and all workspace checks pass.

- [ ] Add components in product-driven groups.
  - **Why:** Installing every registry component increases dependencies, maintenance, Storybook noise, and review surface without delivering user value.
  - **How:** Use this order:

    | Product work | Shared components |
    | --- | --- |
    | Dashboard cards | `card`, `badge`, `button`, `skeleton` |
    | Project filters | `input`, `label`, `native-select` or `select` |
    | Project list | `table`, `pagination`, `empty` |
    | Status editing | `field`, `select`, `button`, `toast` |
    | Responsive navigation | `sidebar`, `sheet`, `separator`, `tooltip` |

    Prefer `native-select` when a native control meets the requirement. Use the richer `select` only when its additional behavior is needed.

  - **Check:** Every installed component has a real current consumer or an explicitly approved near-term use.

### Phase 5 — Make Storybook the design-system contract

- [ ] Move stories next to their components.
  - **Why:** The story evolves with the component and is easy to find during review.
  - **How:** Use:

    ```text
    src/components/button/button.tsx
    src/components/button/button.stories.tsx
    src/components/button/button.test.tsx
    src/components/button/index.ts
    ```

    Follow Component Story Format with `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`. See [Storybook CSF](https://storybook.js.org/docs/api/csf).

  - **Check:** Renaming or changing component props causes its stories to typecheck or fail clearly.

- [ ] Cover behaviorally meaningful states rather than decorative duplicates.
  - **Why:** Stories are executable examples and test cases, not a screenshot gallery.
  - **How:** For Button, cover at least:

    ```text
    Default
    Secondary
    Destructive
    Outline
    Ghost
    Small and large
    Disabled
    Loading, if the design-system API supports it
    Icon with accessible name
    Long translated label
    ```

    For form controls, cover default, focus, disabled, required, invalid, help text, long labels, and keyboard behavior. For overlays, cover open, closed, escape, focus return, and destructive confirmation.

  - **Check:** A reviewer can understand the supported API and edge states without opening the implementation.

- [ ] Use `args` for supported public props.
  - **Why:** Controls provide living documentation and expose whether the component API is understandable.
  - **How:** Put stable defaults in story metadata and override only the state under test in each story.
  - **Check:** Storybook Controls can change documented variants without console errors.

- [ ] Add `play` functions for interactions.
  - **Why:** A component that looks correct can still fail for keyboard and pointer users.
  - **How:** Use `play` tests for interactions such as opening a dialog, selecting an option, submitting a form, dismissing a toast, and returning focus. Assert using accessible roles and names rather than CSS selectors.
  - **Check:** `pnpm --filter @repo/ui test` runs the interaction in Chromium and fails when expected behavior breaks.

- [ ] Make accessibility failures actionable.
  - **Why:** Automated checks catch common role, label, and contrast problems early, although they do not replace manual testing.
  - **How:** Start with `parameters.a11y.test = "todo"` while migrating the sample library. Change it to `"error"` when the initial baseline is clean. Storybook supports enforcing a11y failures in its UI and CI. See [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing).
  - **Check:** A deliberately unlabelled control causes the story test to fail after enforcement is enabled.

- [ ] Support light and dark backgrounds in Storybook.
  - **Why:** Semantic tokens and focus/contrast behavior must be verified in both themes.
  - **How:** Add a toolbar/decorator that toggles the same `.dark` class used by the shell. Do not maintain a second Storybook-only color palette.
  - **Check:** Switching the Storybook theme changes shared tokens without remounting a different component implementation.

### Phase 6 — Consume the design system from the shell

- [ ] Replace raw repeated styling with shared primitives incrementally.
  - **Why:** A large visual rewrite is difficult to review and diagnose.
  - **How:** Migrate one vertical surface at a time:

    ```text
    1. Dashboard cards and links
    2. Project list controls
    3. Project list/table and pagination
    4. Project details and status editor
    5. Loading, empty and error states
    ```

  - **Check:** Each migration keeps data fetching and user behavior unchanged while improving visual consistency.

- [ ] Keep product compositions in feature `ui` folders.
  - **Why:** A shared design system should not become a second application layer.
  - **How:** `DashboardOverview` remains in `apps/shell/features/dashboard/ui`; it imports `Card`, `Badge`, or `Button` from `@repo/ui`.
  - **Check:** `packages/ui` contains no GraphQL-generated types, project models, API URLs, or Next.js route logic.

- [ ] Preserve Server Component compatibility.
  - **Why:** Marking a package barrel or every component with `"use client"` can unnecessarily move large parts of the shell to the client bundle.
  - **How:** Add `"use client"` only to components that use state, effects, event behavior requiring a Client Component, or a client-only primitive. Keep presentational components server-compatible where possible. Avoid a barrel that forces server-compatible components through a client-only entry point.
  - **Check:** Server pages can import presentational shared components without becoming Client Components.

### Phase 7 — Add CI and maintenance rules

- [ ] Run the UI quality gates in CI.
  - **Why:** A local Storybook is useful; a required automated contract prevents regressions.
  - **How:** CI should run:

    ```bash
    pnpm --filter @repo/ui lint
    pnpm --filter @repo/ui typecheck
    pnpm --filter @repo/ui test
    pnpm --filter @repo/ui build-storybook
    ```

    Keep `build-storybook` separate from the package's future library `build` script. A library build and a documentation-site build are different artifacts.

  - **Check:** A broken story, TypeScript error, accessibility violation configured as `error`, or Storybook build failure blocks the pull request.

- [ ] Add visual regression only after stories are deterministic.
  - **Why:** Visual snapshots with random dates, animation, network requests, or unstable fonts produce noisy failures.
  - **How:** Keep shared component stories independent of GraphQL and mock time where needed. Then connect Chromatic using a repository secret and review baseline changes in pull requests.
  - **Check:** An intentional component style change produces one explainable visual diff.

- [ ] Establish an upstream-update workflow.
  - **Why:** shadcn copies source; it does not automatically patch owned components.
  - **How:** Before updating an installed component:

    ```bash
    pnpm dlx shadcn@latest add button -c apps/shell --diff
    ```

    Review upstream differences, preserve local accessibility and API decisions, update stories, and run all UI checks. Do not use `--overwrite` on customized components without a clean Git baseline and an explicit review plan.

  - **Check:** Every upstream adoption is visible in code review and includes updated verification evidence.

---

## 7. Component API standards

Every component added to `packages/ui` should satisfy these rules.

### API design

- Prefer composition over large boolean prop collections.
- Forward supported native attributes to the underlying element.
- Use semantic variant names such as `default`, `secondary`, and `destructive`.
- Keep product statuses such as `ACTIVE` and `PAUSED` out of primitive variants.
- Support `className` for controlled extension, but do not require consumers to repair default styling.
- Avoid exposing Base UI implementation details unless consumers genuinely need them.
- Prefer controlled and uncontrolled patterns consistent with the underlying primitive.
- Document whether a component is client-only.

### Accessibility

- Use semantic HTML before ARIA.
- Every control must have an accessible name.
- Visible focus must remain clear in light and dark themes.
- Disabled and loading states must be communicated semantically, not only through color.
- Icon-only buttons require an accessible label.
- Dialogs must have an accessible title, focus containment, escape behavior, and focus restoration.
- Form errors must be programmatically associated with their controls.
- Color contrast and zoom behavior require manual review in addition to automated a11y tests.

Complex widgets should follow the current [WAI-ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).

### Styling

- Use semantic tokens instead of raw colors in component source.
- Prefer `bg-background` and `text-foreground` over fixed `white` and `black` values.
- Keep arbitrary values exceptional and documented.
- Do not construct Tailwind class names from fragments (for example, joining `bg-`, a color, and `-500`); Tailwind cannot reliably discover them.
- Use a consistent spacing, radius, typography, shadow, and motion scale.
- Respect `prefers-reduced-motion` for nonessential animation.
- Test long text, narrow widths, zoom, and translated labels.

### React and Next.js boundaries

- Do not add `"use client"` automatically to every file.
- Do not import feature data sources into shared components.
- Do not read environment variables in `packages/ui`.
- Do not fetch data from shared primitives.
- Do not include authentication, analytics, or navigation policy directly in primitive components.

---

## 8. Story requirements by component type

| Type | Required story coverage |
| --- | --- |
| Button/action | variants, sizes, disabled, icon, long label, keyboard activation |
| Input/field | default, labelled, required, invalid, disabled, help text, long value |
| Badge/status visual | semantic variants, long content, contrast in both themes |
| Card/layout | header/content/footer combinations, narrow width, empty content |
| Select/combobox | closed, open, keyboard navigation, disabled, invalid, long options |
| Dialog/sheet | open, close, escape, focus return, destructive action, overflow |
| Table | normal, empty, loading, narrow viewport, long cells, action controls |
| Toast | success, error, action, timeout behavior, reduced motion |
| Skeleton/spinner | accessible loading context and reduced motion |

Do not put live backend requests in shared primitive stories. Supply deterministic props and callbacks. Feature-level stories in the shell may use MSW when a network boundary is part of the feature behavior.

---

## 9. Recommended first delivery slices

### Pull request 1 — Foundation

- [ ] Add both `components.json` files.
- [ ] Add package imports and subpath exports.
- [ ] Create the shared Tailwind stylesheet and semantic tokens.
- [ ] Configure Storybook to compile and import the stylesheet.
- [ ] Verify light and dark themes.
- [ ] Do not migrate dashboard markup yet.

### Pull request 2 — First primitives

- [ ] Add Button, Card, Badge, and Skeleton through shadcn.
- [ ] Replace the sample Button rather than keeping two implementations.
- [ ] Add typed stories and a11y coverage.
- [ ] Build Storybook successfully.

### Pull request 3 — Dashboard migration

- [ ] Compose dashboard cards from shared Card and Badge primitives.
- [ ] Use Skeleton for the dashboard loading state.
- [ ] Keep GraphQL fetching in the shell feature, not in `packages/ui`.
- [ ] Capture desktop and narrow-viewport visual baselines.

### Pull request 4 — Project browsing controls

- [ ] Add Input, Label, Native Select/Select, Table, Pagination, and Empty.
- [ ] Add keyboard interaction stories where applicable.
- [ ] Migrate project list filters and pagination without changing URL behavior.

### Pull request 5 — Enforcement

- [ ] Add Storybook tests and static build to CI.
- [ ] Set clean story accessibility checks to `error`.
- [ ] Add Chromatic only when stories are deterministic and credentials are approved.
- [ ] Document the component review checklist in the pull-request template.

---

## 10. Definition of done for a shared component

A component is complete only when all applicable items pass:

- [ ] It solves a current product need.
- [ ] It lives in `packages/ui/src/components`.
- [ ] It has a stable public subpath export.
- [ ] Its props are typed and native props are preserved where appropriate.
- [ ] It uses semantic design tokens.
- [ ] It works in light and dark themes.
- [ ] It has stories for meaningful variants and edge states.
- [ ] Interactive behavior has a `play` test.
- [ ] Automated a11y checks pass.
- [ ] Keyboard and focus behavior were manually checked.
- [ ] It works at narrow width and browser zoom.
- [ ] It does not import shell feature or GraphQL code.
- [ ] It does not unnecessarily force a Client Component boundary.
- [ ] Lint, typecheck, Storybook tests, and Storybook build pass.
- [ ] The consuming shell screen was visually checked.

---

## 11. Common mistakes to avoid

- Do not run the new-project `shadcn init --monorepo` scaffolder over this existing repository.
- Do not install all shadcn components at once.
- Do not treat generated shadcn source as untouchable vendor code.
- Do not blindly overwrite customized components during upgrades.
- Do not maintain separate color tokens in Storybook and the shell.
- Do not put product-aware components into the primitive package.
- Do not make every shared component a Client Component.
- Do not import from `@repo/ui/src/**`.
- Do not depend on transitive or shell-owned packages from `packages/ui`.
- Do not commit `storybook-static/`; it is a generated deployment artifact.
- Do not rely only on snapshot tests; prefer render, interaction, accessibility, and visual tests.
- Do not assume an accessible primitive guarantees an accessible final composition. Labels, contrast, content, and workflow still require product-level review.

---

## 12. Verification command set

During component development:

```bash
pnpm --filter @repo/ui storybook
```

Before committing UI-package work:

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui typecheck
pnpm --filter @repo/ui test
pnpm --filter @repo/ui build-storybook
```

Before merging a shell migration:

```bash
pnpm --filter shell lint
pnpm --filter shell typecheck
pnpm --filter shell test
pnpm --filter shell build
```

From the repository root, the existing Turbo commands remain the broad quality gates:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Note: the current root `build` does not automatically mean “build Storybook.” Keep `build-storybook` as an explicit CI command or add a deliberate Turbo task for it.

---

## 13. Research references

Primary sources used for this guide:

- [shadcn/ui introduction](https://ui.shadcn.com/docs)
- [shadcn/ui monorepo setup](https://ui.shadcn.com/docs/monorepo)
- [shadcn manual installation](https://ui.shadcn.com/docs/installation/manual)
- [shadcn `components.json` reference](https://ui.shadcn.com/docs/components-json)
- [shadcn CLI reference](https://ui.shadcn.com/docs/cli)
- [shadcn Tailwind v4 and React 19 guidance](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn Base UI default announcement, July 2026](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [Base UI overview](https://base-ui.com/react/overview/about)
- [Base UI accessibility](https://base-ui.com/react/overview/accessibility)
- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind CSS source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Tailwind CSS Vite installation](https://tailwindcss.com/docs/installation/using-vite)
- [Storybook React with Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Storybook Tailwind recipe](https://storybook.js.org/recipes/tailwindcss/)
- [Storybook stories and component testing](https://storybook.js.org/docs/writing-tests/index)
- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index)
- [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [WAI-ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)

## Final architectural rule

`packages/ui` owns reusable visual language and accessible interaction primitives. `apps/shell` owns product meaning, data, routing, and workflows. Storybook proves the shared components in isolation; the shell proves that those components work together in the real user journey.
