---
description: "Implementation tasks for client feature organization and navigation"
---

# Tasks: Client Feature Organization and Navigation

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [navigation contract](./contracts/navigation.md), and [quickstart.md](./quickstart.md).

**Tests**: The specification and plan explicitly require unit, navigation, responsive, service-backed, and user-acceptance validation. Write new automated tests before the corresponding implementation where feasible.

**Organization**: Tasks are grouped by user story. Paths are relative to the repository root. `[P]` indicates tasks in the same phase that can run concurrently once their stated prerequisites are met; do not edit the same file concurrently.

**Existing work**: The current worktree already adds the requested route guards, logout redirect, session rehydration changes, and related tests. Preserve these changes; the access tasks below verify and extend them rather than reimplementing them. Navigation reorganization remains to be implemented.

## Phase 1: Setup

**Purpose**: Establish a trustworthy baseline without changing unrelated fixtures or installing new tooling.

- [X] T001 Record the existing route/authentication changes, the current build result, and the known unrelated test-compilation failures in `specs/009-organize-feature-navigation/quickstart.md`.
- [X] T002 Run the existing route, shell, guard, and session tests using an isolated temporary test configuration if the standard test build remains blocked; record commands, results, and any blockers in `specs/009-organize-feature-navigation/quickstart.md`, and remove the temporary configuration afterward.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provide a single typed route-ownership and navigation model shared by all stories.

- [X] T003 [P] Add model tests for seven ordered area IDs, unique ownership, available destinations, hidden Settings, and typed route context in `src/app/navigation/navigation.model.spec.ts`.
- [X] T004 [P] Add router metadata tests for every route pattern, retained legacy `source` data, route titles, parent context, and public/auth routes in `src/app/navigation/navigation-route-metadata.spec.ts`.
- [X] T005 Define typed area, destination, icon, availability, and route-context structures plus the ordered area/destination configuration in `src/app/navigation/navigation.model.ts`; do not add a store, placeholder route, or second URL-prefix ownership algorithm.
- [X] T006 Annotate every area-owned route in `src/app/app.routes.ts` with its unique area, page label, document title, and appropriate parent context while preserving paths, order, guards, lazy imports, redirects, parameters, and tailoring `data.source`.
- [X] T007 Implement route-context selection in `src/app/navigation/navigation-context.ts` from the deepest successfully activated route, preserving prior context on cancellation and resolving parent IDs without changing query parameters.
- [X] T008 Add focused tests for completed, cancelled, redirected, query-only, detail, and auth-page navigation in `src/app/navigation/navigation-context.spec.ts`.

**Checkpoint**: Shared route metadata and navigation definitions are ready; existing access behavior and addresses remain intact.

## Phase 3: User Story 1 - Find existing work by business area (Priority: P1) — MVP

**Goal**: Group reachable existing destinations under the specified business areas and distinguish the pipeline from the journal.

**Independent Test**: Navigate from the primary menu to every currently available area and destination; verify the correct active area, recognizable page title, and distinct pipeline and journal labels.

### Tests for User Story 1

- [X] T009 [P] [US1] Add primary/secondary menu tests for labels, ordering, unique ownership, icons, destination links, and active-area state in `src/app/navigation/primary-navigation.spec.ts`.
- [X] T010 [P] [US1] Extend shell tests in `src/app/app.spec.ts` to cover the grouped menu, preserved session controls and workflow status, and page/parent context without duplicate headings.
- [X] T011 [P] [US1] Add route-title and parent-link tests for list, creation, session, detail, and document-preview routes in `src/app/navigation/navigation-page-context.spec.ts`.

### Implementation for User Story 1

- [X] T012 [US1] Create a standalone primary/secondary navigation component using the shared definitions and route context in `src/app/navigation/primary-navigation.ts` and `src/app/navigation/primary-navigation.html`; render accessible labels and decorative local icons.
- [X] T013 [US1] Integrate the navigation component and active context in `src/app/app.ts` and `src/app/app.html`, retaining brand, login/logout, workflow status, and router outlet.
- [X] T014 [US1] Add consistent desktop navigation styling and active-area/focus presentation in `src/app/navigation/primary-navigation.scss` and `src/app/app.scss` without replacing the existing theme.
- [X] T015 [US1] Use route title metadata and existing back links; add a minimal parent breadcrumb only where needed in `src/app/app.ts` and `src/app/app.html`, preserving entity-specific page headings and resolving request IDs.
- [X] T016 [US1] Clarify the existing in-memory pipeline's identity as Workflow pipeline, distinct from Application journal, in `src/app/pages/jobs/jobs.html` and its dashboard shortcut in `src/app/pages/dashboard/dashboard.html`, without changing workflow behavior.
- [X] T017 [US1] Run the US1 model, navigation, context, shell, and page-context tests and record results against the route matrix in `specs/009-organize-feature-navigation/quickstart.md`.

**Checkpoint**: US1 is independently demonstrable with existing destinations grouped, including Tailoring session and history; service-backed verification remains part of US4.

## Phase 4: User Story 2 - Continue established workflows and links (Priority: P1)

**Goal**: Preserve direct links and contextual journeys while enforcing the updated authentication policy.

**Independent Test**: Open all route patterns directly while signed in and signed out; verify public exceptions, guarded redirects with the original URL, logout, and tailoring launch context.

### Tests for User Story 2

- [X] T018 [P] [US2] Extend `src/app/app.routes.spec.ts` to assert the complete guard matrix, public auth pages, signed-out return URLs including queries, signed-in access, and root/wildcard redirects without discarding existing tests.
- [ ] T019 [P] [US2] Add router integration tests in `src/app/navigation/route-compatibility.spec.ts` for all existing route patterns, `/applications/new` precedence, legacy tailoring source routes, document IDs, browser back/forward, and preserved query context.
- [X] T020 [P] [US2] Extend `src/app/core/state/local-auth-store.spec.ts` and `src/app/core/guards/auth.guard.spec.ts` as needed to verify expired or removed sessions cannot pass the guard and existing valid sessions still work.
- [X] T021 [P] [US2] Add tests for job/report tailoring actions and completed CV/cover-letter request, preview, and download navigation in `src/app/navigation/tailoring-links.spec.ts`, using representative fixtures and preserving existing feature tests.

### Implementation for User Story 2

- [X] T022 [US2] Verify and, only if tests reveal gaps, correct the guard assignments and ordering in `src/app/app.routes.ts`: only `/dashboard` and `/normalized-jobs` are public feature pages; `/auth` and `/auth/register` remain public.
- [X] T023 [US2] Verify logout leaves protected content and stale or expired sessions are cleared in `src/app/app.ts` and `src/app/core/state/local-auth-store.ts`; fix only failures revealed by T018 or T020.
- [X] T024 [US2] Preserve or minimally repair existing contextual links and parent returns in `src/app/pages/normalized-job-detail/normalized-job-detail.html`, `src/app/pages/matching-reports/matching-report-detail.html`, and `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.html`, including identifiers and launch parameters.
- [ ] T025 [US2] Run the route/access/context tests and exercise authenticated and anonymous deep links per `specs/009-organize-feature-navigation/quickstart.md`; record blocked service-backed checks rather than claiming success.

**Checkpoint**: Route compatibility and the access matrix are verifiable independently of responsive styling.

## Phase 5: User Story 3 - Navigate comfortably on different screens (Priority: P2)

**Goal**: Make the same navigation tree usable on desktop and at 320px, including keyboard and focus behavior.

**Independent Test**: At desktop and 320px widths, navigate every available area with pointer and keyboard; verify focus, menu disclosure, active context, parent return, and no navigation-caused horizontal overflow.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add keyboard/disclosure tests for Enter, Space, Escape, focus restoration, `aria-expanded`, `aria-controls`, exact `aria-current`, and close-on-navigation in `src/app/navigation/primary-navigation-responsive.spec.ts`.
- [X] T027 [P] [US3] Add shell tests in `src/app/navigation/navigation-responsive-shell.spec.ts` proving there is one navigation tree and session controls remain reachable while the menu changes state.

### Implementation for User Story 3

- [X] T028 [US3] Implement accessible desktop disclosures and a mobile menu toggle with local ephemeral state in `src/app/navigation/primary-navigation.ts` and `src/app/navigation/primary-navigation.html`; close on successful mobile navigation and restore trigger focus on Escape.
- [X] T029 [US3] Implement Bootstrap `lg` breakpoint, wrapping, visible focus, and 320px overflow-safe layout in `src/app/navigation/primary-navigation.scss` and `src/app/app.scss` without duplicating menu markup or trapping focus.
- [ ] T030 [US3] Run automated interaction tests and perform real-browser pointer, keyboard, viewport, focus, and overflow checks; record desktop and 320px results in `specs/009-organize-feature-navigation/quickstart.md`.

**Checkpoint**: The grouped navigation remains usable across both target widths with no loss of destinations.

## Phase 6: User Story 4 - Avoid empty or misleading areas (Priority: P2)

**Goal**: Hide unavailable areas without inventing features, and keep Tailoring extensible and correctly owned.

**Independent Test**: Confirm Settings is absent, Tailoring session and history are available through navigation, and authentication and direct routes remain intact.

### Tests for User Story 4

- [ ] T031 [P] [US4] Add availability tests in `src/app/navigation/navigation-availability.spec.ts` for hidden Settings, enabled Tailoring, no enabled empty areas, and no visibility change on sign-out, empty results, or transient request failures.
- [X] T032 [P] [US4] Add tests in `src/app/navigation/navigation-extensibility.spec.ts` showing future Tailoring and Settings destinations can be added without modifying other area ownership or routes.

### Implementation for User Story 4

- [X] T033 [US4] Complete the static availability configuration in `src/app/navigation/navigation.model.ts`: hide Settings, enable existing Tailoring session and history, and preserve routes and contextual links without adding probes or placeholders.
- [ ] T034 [US4] With an approved service and representative authenticated fixtures, verify tailoring session or history and exercise request details plus CV/cover-letter preview/download where fixtures permit; record evidence and the target deployment visibility decision in `specs/009-organize-feature-navigation/quickstart.md`.
- [X] T035 [US4] Keep existing Tailoring navigation enabled in `src/app/navigation/navigation.model.ts` when service verification is unavailable; record the release verification blocker in `specs/009-organize-feature-navigation/quickstart.md`.

**Checkpoint**: Empty areas are not misleading, and the Tailoring release decision is evidence-based.

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T036 [P] Update current navigation, public/protected routes, pipeline distinction, and tailoring visibility guidance in `README.md` to reflect the completed implementation.
- [ ] T037 [P] Audit all primary destinations, active-state ownership, page titles, and parent links against `specs/009-organize-feature-navigation/contracts/navigation.md`, and correct only navigation-related discrepancies in `src/app/navigation/` and `src/app/app.routes.ts`.
- [ ] T038 Run focused and full configured tests plus `npm run build`; document results, existing fixture failures, and bundle warnings in `specs/009-organize-feature-navigation/quickstart.md` without modifying unrelated fixtures.
- [ ] T039 Complete the end-to-end route, authentication, browser, and service-backed walkthrough in `specs/009-organize-feature-navigation/quickstart.md`, including anonymous access to actual normalized-job data; document any unavailable prerequisites as blockers.
- [ ] T040 Conduct the SC-004 usability exercise with at least five representative users and record first-attempt results plus SC-001 through SC-006 outcomes in `specs/009-organize-feature-navigation/quickstart.md`; if users or services are unavailable, record the acceptance as blocked.

## Dependencies & Execution Order

### Phase Dependencies

- Setup T001–T002 precedes the foundation. The known full-suite compilation problem may remain documented while an isolated test configuration permits focused work.
- Foundation T003/T004 tests precede T005/T006; T007 depends on the route context established by T005/T006, and T008 verifies it.
- US1 depends on the foundation; its menu implementation precedes US3's responsive changes and US4's final availability wiring.
- US2 depends on the foundation but its route/access tests can proceed independently of US1. Its context-preservation implementation must coordinate with T006 and shared files.
- US3 depends on the US1 navigation component and shell integration. US4 availability tests and service verification can start after the foundation; Tailoring navigation remains enabled regardless of pending service verification.
- Polish follows the relevant story work; T038–T040 are release gates. T034/T035 and T039/T040 remain blocked if their required real services, fixtures, or representative users are unavailable.

### User Story Dependencies

- **US1 (P1)**: Foundation only; produces the grouped navigation MVP.
- **US2 (P1)**: Foundation only for route and access checks; integration with the grouped shell is validated after US1.
- **US3 (P2)**: Requires the US1 navigation component; can be tested independently once that component exists.
- **US4 (P2)**: Availability tests and verification are independent of US3; final visibility uses the shared model and US1 menu.

### Parallel Opportunities

- Foundation tests T003 and T004 work in different files; complete both before their corresponding model/metadata changes.
- After the foundation, US1 tests T009–T011 and US2 tests T018–T021 can run in parallel on separate files. Coordinate any edits to `src/app/app.spec.ts` or `src/app/app.routes.ts`.
- After the US1 component exists, US3 tests T026–T027 and US4 tests T031–T032 can run in parallel; T034 can run independently when the service and fixtures are ready.
- T036 and T037 have different target files and can proceed concurrently; do not overlap T037 with other edits to its navigation or route files.

## Parallel Examples

### User Story 1

- T009: Test primary navigation in `src/app/navigation/primary-navigation.spec.ts`.
- T011: Test page context in `src/app/navigation/navigation-page-context.spec.ts`.

### User Story 2

- T019: Test route compatibility in `src/app/navigation/route-compatibility.spec.ts`.
- T021: Test tailoring links in `src/app/navigation/tailoring-links.spec.ts`.

### User Story 3

- T026: Test keyboard interactions in `src/app/navigation/primary-navigation-responsive.spec.ts`.
- T027: Test shell behavior in `src/app/navigation/navigation-responsive-shell.spec.ts`.

### User Story 4

- T031: Test availability in `src/app/navigation/navigation-availability.spec.ts`.
- T032: Test extensibility in `src/app/navigation/navigation-extensibility.spec.ts`.

## Implementation Strategy

### MVP First

1. Finish setup and foundation, retaining the already implemented access policy.
2. Deliver US1 and validate grouped navigation and route ownership independently.
3. Demonstrate the MVP without claiming release readiness until US2–US4 and their external verification gates are satisfied.

### Incremental Delivery

1. Add US2 compatibility and access verification; preserve existing addresses and workflows.
2. Add US3 responsive and keyboard behavior using the same navigation tree.
3. Complete US4 service verification and extensibility without adding placeholder functionality or disabling existing Tailoring navigation.
4. Run cross-cutting validation and the required usability exercise; report any blocked checks explicitly.
