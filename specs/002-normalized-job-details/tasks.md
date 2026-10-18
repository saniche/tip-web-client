---
description: "Executable task list for the normalized job details feature"
---

# Tasks: Normalized Job Details

**Input**: Design documents from `/specs/002-normalized-job-details/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No separate test-first tasks are included because the feature specification did not explicitly request TDD. Implementation should preserve the repository's existing focused component and HTTP test conventions.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the page and contract touchpoints without changing behavior yet.

- [X] T001 [P] Add the normalized job detail page directory and placeholder files at `src/app/pages/normalized-job-detail/normalized-job-detail.ts`, `src/app/pages/normalized-job-detail/normalized-job-detail.html`, and `src/app/pages/normalized-job-detail/normalized-job-detail.scss`
- [X] T002 [P] Add the detail route shape and lazy-loading entry in `src/app/app.routes.ts` for `/normalized-jobs/:id`
- [X] T003 [P] Confirm the server field mapping and assumed mutation paths against `src/app/core/models/normalized-job.ts`, `src/app/core/api/tip-api.ts`, and `specs/002-normalized-job-details/contracts/normalized-job-detail.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared data and API infrastructure required by all user stories.

**⚠️ CRITICAL**: User story work depends on this phase.

- [X] T004 Extend `src/app/core/models/normalized-job.ts` with typed `NormalizedJobDetail` and `NormalizedJobHeaderUpdate` models covering all server response fields, nullable optional values, list fields, status, and `hasWriteAccess`
- [X] T005 Add typed `getNormalizedJob`, `updateNormalizedJob`, and `deleteNormalizedJob` methods to `src/app/core/api/tip-api.ts`, using `GET`, assumed `PATCH`, and `DELETE` requests against `/jobs/{job_id}` with encoded IDs
- [X] T006 [P] Add the corresponding HTTP request and payload coverage to `src/app/core/api/tip-api.spec.ts`, including snake-case response-field mapping expectations and the four-field update payload boundary
- [X] T007 Update the normalized listing link in `src/app/pages/normalized-jobs/normalized-jobs.html` to use the new `/normalized-jobs/:id` route without losing the existing listing behavior

**Checkpoint**: Shared models, API methods, and navigation entry points are ready for story implementation.

---

## Phase 3: User Story 1 - View a Normalized Job's Details (Priority: P1) 🎯 MVP

**Goal**: Let any authorized listing user open a job ID and inspect the complete detail record, status, and source-link behavior.

**Independent Test**: Open `/normalized-jobs/:id` for an existing job and verify every returned field is displayed, email sources are non-clickable, non-email URLs are links, and load/not-found/error states are actionable.

### Implementation for User Story 1

- [X] T008 [US1] Implement route-ID reading, positive/nonblank ID validation, cancellable detail loading, retry handling, and loading/loaded/not-found/error state management in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`
- [X] T009 [US1] Implement complete read-only detail markup in `src/app/pages/normalized-job-detail/normalized-job-detail.html` for title, header values, dates, long-form sections, list fields, status, submitter, and creation metadata
- [X] T010 [US1] Implement conditional source URL rendering in `src/app/pages/normalized-job-detail/normalized-job-detail.html` and `src/app/pages/normalized-job-detail/normalized-job-detail.ts`, disabling the link when the source is email or the URL is blank
- [X] T011 [P] [US1] Add responsive detail-page styling, readable long-form sections, status presentation, and loading/error/empty states in `src/app/pages/normalized-job-detail/normalized-job-detail.scss`
- [X] T012 [US1] Add a return-to-listing link and retry/unavailable actions in `src/app/pages/normalized-job-detail/normalized-job-detail.html`

**Checkpoint**: User Story 1 is independently usable as the MVP without edit or delete controls.

---

## Phase 4: User Story 2 - Update Permitted Header Details (Priority: P2)

**Goal**: Let users whose loaded detail has `has_write_access: true` edit and save only company, location, salary, and source.

**Independent Test**: Load a writable job, edit each permitted field, save valid changes, verify the returned detail is shown, then simulate failure and verify entered values remain available; load a non-writable job and verify no usable edit controls exist.

### Implementation for User Story 2

- [X] T013 [US2] Add a permission-gated edit mode and reactive form state for company, location, salary, and source in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`
- [X] T014 [US2] Add editable header controls, save/cancel actions, disabled/read-only rendering for users without access, and accessible validation/error messaging in `src/app/pages/normalized-job-detail/normalized-job-detail.html`
- [X] T015 [US2] Implement update submission, saving state, successful-response replacement, failed-save messaging, and preservation of entered values in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`
- [X] T016 [P] [US2] Style edit mode, save/cancel controls, field validation, and operation feedback in `src/app/pages/normalized-job-detail/normalized-job-detail.scss`
- [X] T017 [US2] Verify the update flow sends only the four editable fields and does not expose or mutate read-only details in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`

**Checkpoint**: User Stories 1 and 2 are independently usable; read-only users retain the complete viewing experience.

---

## Phase 5: User Story 3 - Delete a Permitted Job (Priority: P2)

**Goal**: Let users with write access confirm deletion and return to the normalized listing without falsely removing a failed deletion.

**Independent Test**: Load a writable job, open and cancel the confirmation, then confirm deletion and verify navigation to the listing; simulate failure and verify the detail remains available; verify non-writable users have no usable delete action.

### Implementation for User Story 3

- [X] T018 [US3] Add permission-gated delete action, confirmation state, and delete-operation state handling in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`
- [X] T019 [US3] Add accessible delete confirmation UI, cancel/confirm actions, deleting feedback, and failure messaging in `src/app/pages/normalized-job-detail/normalized-job-detail.html`
- [X] T020 [US3] Navigate to `/normalized-jobs` only after confirmed deletion succeeds and retain the detail page with retry feedback after failure in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`
- [X] T021 [P] [US3] Style delete controls, confirmation presentation, and deleting/failure feedback in `src/app/pages/normalized-job-detail/normalized-job-detail.scss`

**Checkpoint**: All three user stories are independently functional and permission-safe.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate integration, accessibility, and the documented end-to-end scenarios.

- [X] T022 [P] Review `src/app/pages/normalized-job-detail/normalized-job-detail.html` for keyboard-accessible controls, labels, status announcements, and safe external-link behavior
- [X] T023 [P] Review `src/app/pages/normalized-job-detail/normalized-job-detail.ts` for stale-response protection, explicit error handling, and no false success states across load, update, and delete operations
- [X] T024 Run the focused validation commands from `specs/002-normalized-job-details/quickstart.md` and resolve any TypeScript, template, or build failures
- [X] T025 Update `specs/002-normalized-job-details/contracts/normalized-job-detail.md` if backend verification changes the assumed update/delete methods or field casing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001, T002, and T003 can run in parallel.
- **Foundational (Phase 2)**: Depends on Setup; T004 and T005 are sequential model/API prerequisites, while T006 can follow the API method shape and T007 can run once the route exists.
- **User Stories (Phases 3-5)**: Depend on the Foundational phase. US1 is the MVP. US2 and US3 can begin after the shared foundation, but both reuse the detail page created by US1, so sequential delivery after US1 is the lowest-risk path.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only; no dependency on other stories.
- **User Story 2 (P2)**: Depends on Phase 2 and the detail rendering/state established by US1.
- **User Story 3 (P2)**: Depends on Phase 2 and the detail rendering/state established by US1; independent of US2.

### Parallel Opportunities

- T001-T003 can be started in parallel during setup.
- T006 and T007 can proceed in parallel after the relevant model/API or route changes are available.
- T011 can proceed in parallel with the core US1 TypeScript and template work.
- T016 can proceed in parallel with US2 form logic after the template structure is known.
- T021 can proceed in parallel with US3 delete logic after the UI states are named.
- T022 and T023 can proceed in parallel during polish.
- US2 and US3 can be assigned to separate implementers after US1 if the shared page interfaces are agreed, although sequential implementation is recommended.

## Implementation Strategy

1. Complete the shared route/model/API foundation.
2. Deliver US1 as the MVP: detail loading and complete read-only presentation.
3. Add US2 update capability while preserving the read-only path.
4. Add US3 deletion with confirmation and failure recovery.
5. Run the quickstart validation and resolve any backend contract differences before release.

## Phase 7: Convergence

- [X] T026 Add `src/app/pages/normalized-job-detail/normalized-job-detail.spec.ts` covering detail loading, complete field rendering, source-link rules, permission-gated editing/deletion, update failure preservation, and deletion navigation per plan testing and SC-002 (missing)
- [X] T027 Replace manual signal-based header editing with an Angular Reactive Forms model in `src/app/pages/normalized-job-detail/normalized-job-detail.ts` and `src/app/pages/normalized-job-detail/normalized-job-detail.html` per the plan dependency and T013 (partial)
- [X] T028 Add explicit processing/completed/failed status classification and distinct styling in `src/app/pages/normalized-job-detail/normalized-job-detail.ts`, `src/app/pages/normalized-job-detail/normalized-job-detail.html`, and `src/app/pages/normalized-job-detail/normalized-job-detail.scss` per FR-004 and US1/AC4 (partial)
