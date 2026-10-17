# Tasks: Normalized Job Listing

**Input**: Design documents from `specs/001-normalized-job-list/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/normalized-jobs.md

**Tests**: No test-authoring tasks are included because tests were not explicitly requested. Existing project tests and build are run during final validation.

**Organization**: Tasks are grouped by the feature's prioritized user stories. The existing Angular application is already initialized, so no dependency installation or project bootstrap is required.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

The Angular application, routing, API service, and test/build tooling are already in place. No setup tasks are required.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared listing data contract and API boundary used by all user stories.

- [x] T001 Define `NormalizedJob`, query, wire-response, and internal page types in `src/app/core/models/normalized-job.ts`, including the wire `Items` field and its internal `items` mapping.
- [x] T002 Add a normalized-jobs request to `src/app/core/api/tip-api.ts` that calls `GET /jobs/normalize`, serializes the four optional filters plus `page` and `limit`, applies defaults of page 1 and limit 20, and maps `Items`, `total`, `page`, and `limit` to the internal page model.

**Checkpoint**: Shared types and the typed API boundary are ready for the listing page.

---

## Phase 3: User Story 1 - Browse normalized jobs (Priority: P1) 🎯 MVP

**Goal**: Let users open a normalized-jobs listing and inspect the required details in newest-first order.

**Independent Test**: Open `/normalized-jobs` with a successful service response; verify page 1 requests 20 jobs, every row shows id, title, company, location, posting date, and source, and server order is preserved. Also verify loading, empty, error, and retry states.

### Implementation for User Story 1

- [x] T003 [US1] Create the standalone normalized-jobs page, load the default page through `TipApi`, preserve service order, and render loading, results, empty, failure, and retry states in `src/app/pages/normalized-jobs/normalized-jobs.ts`, `src/app/pages/normalized-jobs/normalized-jobs.html`, and `src/app/pages/normalized-jobs/normalized-jobs.scss`.
- [x] T004 [P] [US1] Register the `normalized-jobs` route for the new page while keeping the existing `/jobs` workflow route unchanged in `src/app/app.routes.ts`.
- [x] T005 [P] [US1] Add a distinct primary-navigation link to `/normalized-jobs` without removing the existing Jobs link in `src/app/app.html`.

**Checkpoint**: Users can navigate to the new listing and browse the default page without changing the existing job workflow.

---

## Phase 4: User Story 2 - Find jobs with filters (Priority: P1)

**Goal**: Let users filter by title, company, location, and source, including combined criteria.

**Independent Test**: Apply each filter alone and in combination; verify the URL and service request contain the active nonblank filters, the page resets to 1, returned rows match all filters, and clearing filters restores unfiltered results.

### Implementation for User Story 2

- [x] T006 [US2] Add title, company, location, and source filter controls to `src/app/pages/normalized-jobs/normalized-jobs.html` and synchronize filter values with `ActivatedRoute.queryParamMap` and `Router` in `src/app/pages/normalized-jobs/normalized-jobs.ts`; trim values, omit blanks, combine filters, reset page to 1 on filter changes, and cancel superseded requests with `switchMap`.

**Checkpoint**: Users can apply or clear individual and combined filters while the listing reflects only the active query.

---

## Phase 5: User Story 3 - Navigate result pages (Priority: P2)

**Goal**: Let users choose a page size and navigate through all matching results.

**Independent Test**: Choose a positive page size, move between pages, and verify the URL and request use the selected `page` and `limit`, the page displays no more than `limit` rows, navigation follows `total`, and refresh/back-forward restore the query.

### Implementation for User Story 3

- [x] T007 [US3] Add page and page-size controls to `src/app/pages/normalized-jobs/normalized-jobs.html` and implement URL synchronization, total-based navigation, positive-integer validation, filter/page-size reset behavior, and recovery from out-of-range pages in `src/app/pages/normalized-jobs/normalized-jobs.ts`.

**Checkpoint**: Users can navigate and resize result pages, and invalid or out-of-range values have a clear recovery path.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and preserve the existing application behavior.

- [ ] T008 Run the project checks and the manual scenarios in `specs/001-normalized-job-list/quickstart.md`; confirm `npm test` and `npm run build` pass and `/jobs` still shows the existing workflow.
  - Validation note: `npm run build` and formatting checks pass; the focused normalized-jobs tests pass (13 tests). The full suite has 40 passing tests and 3 unrelated failures in `profile-section-editors.spec.ts`, so this task remains incomplete. Browser smoke testing confirmed filter submission updates the URL, but live API results and remaining manual scenarios could not be verified because the service/page was unavailable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; the Angular project and dependencies already exist.
- **Foundational (Phase 2)**: T001 precedes T002; both block all user stories.
- **User Story 1 (Phase 3)**: Begins after T001-T002. T004 and T005 can run in parallel after T003 creates the page component.
- **User Story 2 (Phase 4)**: Begins after User Story 1 so it can extend the working listing page and its request stream.
- **User Story 3 (Phase 5)**: Begins after User Story 2 because page-size/filter resets and URL state share the same page controls and query handling.
- **Polish (Phase 6)**: Begins after all desired stories are complete.

### User Story Dependencies

- **US1 (P1)**: Depends on the foundational model and API request; no dependency on another user story.
- **US2 (P1)**: Depends on US1's routed listing and active request flow.
- **US3 (P2)**: Depends on US2's query-driven filter state so filters, page changes, and page resets remain consistent.

### Parallel Opportunities

- T004 (route registration) and T005 (navigation link) touch separate files and can be done in parallel once T003 provides the page component.
- No user story phases are independent of US1 because each extends the same listing experience. Implement US2 and US3 sequentially to avoid concurrent edits to the listing component and template.

## Parallel Example: User Story 1

```text
# After T003 creates the component, register the route and add navigation independently:
Task: "T004 Register /normalized-jobs in src/app/app.routes.ts"
Task: "T005 Add /normalized-jobs navigation in src/app/app.html"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete the foundational model and API request tasks.
2. Complete US1 and verify the default first page, required job fields, loading/empty/error states, and route access.
3. **STOP and VALIDATE**: Demonstrate browsing the normalized jobs independently while preserving `/jobs`.
4. Add US2 filters and independently validate single and combined criteria.
5. Add US3 pagination and independently validate page/limit selection and URL restoration.

### Incremental Delivery

1. Complete the shared API contract and model.
2. Deliver US1 as the minimum viable listing.
3. Deliver US2 to make the listing searchable.
4. Deliver US3 to support navigation through all matching pages.
5. Run the final quickstart validation after the selected stories are integrated.

## Notes

- `[P]` tasks touch different files and have no dependency on one another.
- Story labels map directly to the priorities and user stories in `specs/001-normalized-job-list/spec.md`.
- No test-authoring tasks are included; execute the existing project test suite during final validation.

## Phase 7: Convergence

- [x] T009 Update `TipApi.listNormalizedJobs()` to call `GET /jobs/normalize` and verify the endpoint assertions in `src/app/core/api/tip-api.spec.ts` per FR-001 (contradicts).
- [x] T010 Define the wire response envelope with `items` and map it to internal `items`, preserving `limit`, `total`, and `page`, per the plan's response-envelope decision (contradicts).
- [x] T011 Add `src/app/pages/normalized-jobs/normalized-jobs.spec.ts` coverage for result rendering, query-driven filters and pagination, validation, empty/error/retry states, and stale-response protection per the plan and quickstart (missing).
- [x] T012 Validate normalized-job identifiers before rendering and surface missing or blank IDs as a data error while retaining placeholders for other blank display values per the plan's invalid-identifier decision (partial).
- [X] T013 Re-run the full test suite, production build, and remaining quickstart scenarios after the API and page fixes; record any persistent unrelated profile-editor failures or live-service limitations without changing unrelated behavior per T008 (partial).
