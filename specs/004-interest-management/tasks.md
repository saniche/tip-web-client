# Tasks: Interest Management UI

**Input**: Design documents from `/specs/004-interest-management/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project setup and foundational domain interfaces

- [X] T001 [P] Create job interest data models and query interfaces in src/app/core/models/interest.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API integration methods required by all user stories

**⚠️ CRITICAL**: API client methods and contracts must be in place before user story components can be implemented

- [X] T002 [P] Add unit tests for interest API endpoints (`listInterests`, `addInterest`, `removeInterest`) in src/app/core/api/tip-api.spec.ts
- [X] T003 Implement `listInterests`, `addInterest`, and `removeInterest` methods in src/app/core/api/tip-api.ts

**Checkpoint**: Core domain interfaces and API service methods available and tested.

---

## Phase 3: User Story 1 - Browse Personal Job Interests (Priority: P1) 🎯 MVP

**Goal**: Display an authenticated user's job interests at route `/jobs/interests`, showing job headers (title, company, location, posting date, source link) and interest date, ordered newest first, with loading, empty, and error states.

**Independent Test**: Navigate to `/jobs/interests` (via navigation link or direct URL), verify rendered interest rows display title (linking to `/normalized-jobs/:id`), company, location, dates, source link, and empty/loading/error states.

### Tests for User Story 1

- [X] T004 [P] [US1] Create component tests for interests listing (initial render, loading, empty, error, job header links) in src/app/pages/interests/interests.spec.ts

### Implementation for User Story 1

- [X] T005 [P] [US1] Create component styles in src/app/pages/interests/interests.scss
- [X] T006 [US1] Implement listing template (table layout, job headers, empty/loading/error states) in src/app/pages/interests/interests.html
- [X] T007 [US1] Implement Interests component logic with query execution and view state signals in src/app/pages/interests/interests.ts
- [X] T008 [US1] Register route `/jobs/interests` in src/app/app.routes.ts
- [X] T009 [US1] Add "Interests" link to the primary navigation bar in src/app/app.html

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable at `/jobs/interests`.

---

## Phase 4: User Story 2 - Filter Interests by Job Attributes (Priority: P2)

**Goal**: Enable filtering interests by company, job title, and location with 300 ms debounced input, multi-filter combination, reset-to-page-1 behavior, and stale response cancellation.

**Independent Test**: Enter values into company, title, and location filter inputs, verify debounced server-side query execution, check that multi-filters combine, verify "Clear Filters" action, and verify page resets to 1.

### Tests for User Story 2

- [X] T010 [P] [US2] Add unit tests for filter inputs, 300 ms debounce behavior, clearing filters, and query param synchronization in src/app/pages/interests/interests.spec.ts

### Implementation for User Story 2

- [X] T011 [US2] Add filter controls (title, company, location) and "Clear filters" action in src/app/pages/interests/interests.html
- [X] T012 [US2] Implement debounced filter input handling (300 ms delay), query param updates, and page-reset logic in src/app/pages/interests/interests.ts

**Checkpoint**: Users can search and filter interests with debounced input and URL state synchronization.

---

## Phase 5: User Story 3 - Paginate Interest Results (Priority: P2)

**Goal**: Support server-side pagination with default page size of 20, current page / total record counts, previous/next buttons, and disabled states at boundaries.

**Independent Test**: Load interests with over 20 records, verify page 1 shows 20 items and next button enabled, navigate to page 2, verify previous button enabled, and verify total count and page indicators.

### Tests for User Story 3

- [X] T013 [P] [US3] Add unit tests for pagination navigation (next/previous, disabled boundary states, page size reset) in src/app/pages/interests/interests.spec.ts

### Implementation for User Story 3

- [X] T014 [US3] Add pagination summary and navigation controls (Previous, Next, page indicator, total count) in src/app/pages/interests/interests.html
- [X] T015 [US3] Implement pagination state management and route query synchronization in src/app/pages/interests/interests.ts

**Checkpoint**: Server-side pagination works seamlessly with total counts and disabled boundary controls.

---

## Phase 6: User Story 4 - Remove an Interest (Priority: P3)

**Goal**: Allow users to remove a job from their interests in the listing, requiring confirmation before sending `DELETE /jobs/{job_id}/interest`, disabling in-flight actions, updating totals, and automatically adjusting page boundaries if a page becomes empty.

**Independent Test**: Click "Remove" on an interest row, verify inline/modal confirmation prompt, confirm deletion, verify button disabled during flight, verify item removed on success with updated total count, and verify boundary fallback if deleting the last item on page > 1.

### Tests for User Story 4

- [X] T016 [P] [US4] Add unit tests for interest removal confirmation flow, pending button state, error recovery, and empty-page fallback in src/app/pages/interests/interests.spec.ts

### Implementation for User Story 4

- [X] T017 [US4] Add remove button, inline confirmation prompt, and pending feedback in src/app/pages/interests/interests.html
- [X] T018 [US4] Implement deletion handler with confirmation, `DELETE /jobs/{job_id}/interest` call, list refresh, and empty-page boundary adjustment in src/app/pages/interests/interests.ts

**Checkpoint**: Interest removal is fully operational with user confirmation, race prevention, and boundary protection.

---

## Phase 7: User Story 5 - Manage Interest from Job Details (Priority: P2)

**Goal**: Provide an interest toggle button on the normalized job details view (`/normalized-jobs/:id`) allowing users to add (`POST /jobs/{job_id}/interest`) or remove (`DELETE /jobs/{job_id}/interest`) interest directly.

**Independent Test**: Navigate to `/normalized-jobs/:id`, verify interest button is visible in header actions, click to toggle interest, verify in-flight pending state, verify successful status update, and test error handling.

### Tests for User Story 5

- [X] T019 [P] [US5] Add unit tests for job detail interest toggle action, API calls (`addInterest`/`removeInterest`), and error states in src/app/pages/normalized-job-detail/normalized-job-detail.spec.ts

### Implementation for User Story 5

- [X] T020 [US5] Add interest toggle button to header actions in src/app/pages/normalized-job-detail/normalized-job-detail.html
- [X] T021 [US5] Implement interest toggle logic and pending/error states in src/app/pages/normalized-job-detail/normalized-job-detail.ts

**Checkpoint**: Users can add or remove interests directly from any normalized job detail page.

---

## Phase 8: User Story 6 - Automatic Interest Addition via Job Normalization (Priority: P3)

**Goal**: Validate and ensure the frontend normalization workflow relies on the platform backend to record the interest without dispatching duplicate client-side creation calls.

**Independent Test**: Run normalization submission tests and verify no manual interest creation endpoint is invoked by the client during or after job normalization.

- [X] T022 [P] [US6] Add test verifying normalization workflow does not issue duplicate manual interest creation calls in src/app/pages/normalize-job/normalize-job.spec.ts

**Checkpoint**: Normalization workflow preserves backend automatic interest attachment without redundant requests.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, accessibility, and build validation

- [X] T023 [P] Verify accessibility (ARIA live regions for search results, keyboard navigation for removal confirmation) in src/app/pages/interests/interests.html
- [X] T024 Execute quickstart validation scenarios from specs/004-interest-management/quickstart.md
- [X] T025 Run full test suite and build verification (`npm test` and `npm run build`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001) - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational (Phase 2) completion.
  - **US1 (Phase 3)**: MVP interest listing.
  - **US2 (Phase 4)**: Filters (builds upon US1 list).
  - **US3 (Phase 5)**: Pagination (builds upon US1 list).
  - **US4 (Phase 6)**: Removal (builds upon US1 list).
  - **US5 (Phase 7)**: Job Details toggle (independent of US1 list; depends on Foundational T003).
  - **US6 (Phase 8)**: Normalization verification (independent of US1 list).
- **Polish (Phase 9)**: Depends on all user story phases being completed.

### Parallel Opportunities

- **T001 (models)** and **T002 (API tests)** can be prepared in parallel.
- Within User Story 1: **T004 (tests)** and **T005 (SCSS)** can run in parallel.
- **User Story 5 (Phase 7: Job Details)** can run in parallel with **User Story 1/2/3/4 (Interests page)** once Phase 2 Foundational is complete.
- **User Story 6 (Phase 8: Normalization test)** can run in parallel at any point after Phase 2.

---

## Implementation Strategy & MVP Scope

- **MVP Scope**: Phase 1 (T001), Phase 2 (T002, T003), and Phase 3 (T004-T009). Completing these delivers a working, testable `/jobs/interests` page that fetches and renders the user's saved interests with full job headers.
- **Increment 2**: Phase 4 (Filters) + Phase 5 (Pagination) adds searchability and scalable navigation.
- **Increment 3**: Phase 6 (Removal) + Phase 7 (Job details toggle) completes the full interest management lifecycle.
- **Increment 4**: Phase 8 (Normalization check) + Phase 9 (Polish & build verification).

## Phase 10: Convergence

- [X] T026 Initialize the job detail interest toggle from the job's actual interest state and verify existing interests can be removed per US5/AC3, FR-016 (partial)
- [X] T027 Apply authentication gating to the interests route and handle expired or unauthorized interest requests using platform behavior per US1/AC5, FR-026 (missing)
- [X] T028 Add tests for the 300 ms filter debounce and stale-response cancellation per FR-009, FR-010 (partial)
- [X] T029 Add tests for duplicate removal prevention, failure preserving the listing, and fallback after the last item on a page is removed per FR-018, FR-020, FR-021 (partial)
