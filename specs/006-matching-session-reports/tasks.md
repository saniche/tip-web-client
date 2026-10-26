---
description: 'Implementation tasks for Matching Sessions and Reports'
---

# Tasks: Matching Sessions and Reports

**Input**: Design documents from `specs/006-matching-session-reports/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/matching-api.md`, `quickstart.md`

**Tests**: Included because the feature specification explicitly requires relevant frontend tests using verified service contracts and existing test conventions.

**Organization**: Tasks are grouped by user story. The backend-contract verification task is a hard prerequisite; do not implement an unverified endpoint or response shape.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable; edits a different file and has no dependency on incomplete tasks.
- **[Story]**: User story represented by the task (`US1`, `US2`, or `US3`). Setup and foundational tasks have no story label.
- Every task includes the repository file path(s) to inspect or modify.

## Path Conventions

- This is a single Angular application. Application code and tests are under `src/app/`; feature planning and validation documents are under `specs/006-matching-session-reports/`.

## Phase 1: Setup

**Purpose**: Confirm the existing project setup; avoid unnecessary tooling or dependency changes.

- [x] T001 Confirm the Angular, test, and build commands and existing dependencies in `package.json` and `angular.json`; do not add packages unless an implementation requirement demonstrates a missing dependency.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Record the user-approved provisional contract and establish shared typed API behavior before user-story implementation depends on it.

- [x] T002 Record the user-approved feature-brief model and its provisional assumptions/unknowns in `specs/006-matching-session-reports/contracts/matching-api.md`; proceed without server schemas, but do not infer omitted fields or status values.
- [x] T003 [P] Add HTTP tests using only fields/shapes explicitly stated or provisionally assumed in `specs/006-matching-session-reports/contracts/matching-api.md` for matching submission, process retrieval, report listing, report detail, and report deletion in `src/app/core/api/matching-api.spec.ts`.
- [x] T004 [P] Define matching API DTOs and unknown-preserving process/report status types from the provisional model in `src/app/core/models/matching.ts`; do not reuse the normalization status fallback.
- [x] T005 Implement the described matching and report operations in `src/app/core/api/tip-api.ts` and map them with the types from `src/app/core/models/matching.ts`, keeping normalization API behavior unchanged and surfacing invalid response shapes.

**Checkpoint**: The provisional API boundary and shared types are ready; all remaining assumptions are documented and handled conservatively.

---

## Phase 3: User Story 1 - Assemble and submit a matching session (Priority: P1) 🎯 MVP

**Goal**: Let users create one editable session from Normalized Jobs and My Interests, review the selection and prerequisites, and explicitly confirm only when valid.

**Independent Test**: Assemble a mixed-source selection, add a duplicate, remove a job, navigate/reload, review, and verify profile/empty/limit gating without starting matching or changing interests during selection.

### Tests for User Story 1

- [x] T006 Add matching-store tests for one active session, mixed-source additions, ID deduplication, edits, `sessionStorage` restore, locked states, discard confirmation behavior, and storage clearing in `src/app/core/state/matching-store.spec.ts`.
- [x] T007 [P] Add Normalized Jobs page tests for adding the selected job to a matching session without an API call in `src/app/pages/normalized-jobs/normalized-jobs.spec.ts`.
- [x] T008 [P] Add My Interests page tests for adding the selected job to the same session without changing interest membership in `src/app/pages/interests/interests.spec.ts`.
- [x] T009 Add matching-session page tests for review count/details, interest-add count, empty/batch/profile confirmation gating, profile link, return-to-edit, matched notices only from already-loaded reliable data, and safe discard in `src/app/pages/matching-session/matching-session.spec.ts`.

### Implementation for User Story 1

- [x] T010 Implement the open-session lifecycle, selected-job snapshots, deduplication, add/remove actions, and validated transient persistence in `src/app/core/state/matching-store.ts` using types from `src/app/core/models/matching.ts`.
- [x] T011 Add a Normalized Jobs action that passes the existing job identifier, available details, and entry source to the matching store in `src/app/pages/normalized-jobs/normalized-jobs.ts` and `src/app/pages/normalized-jobs/normalized-jobs.html`.
- [x] T012 Add the equivalent My Interests action using each interest's embedded job in `src/app/pages/interests/interests.ts` and `src/app/pages/interests/interests.html`.
- [x] T013 Build and route the shared session/review screen with edit, remove, cancel, discard, empty/profile/verified-limit gating, and profile-creation navigation in `src/app/pages/matching-session/matching-session.ts`, `src/app/pages/matching-session/matching-session.html`, `src/app/pages/matching-session/matching-session.scss`, and `src/app/app.routes.ts`.

**Checkpoint**: Users can assemble, edit, resume, and review a mixed-source session; selection alone makes no interest-add or matching request.

---

## Phase 4: User Story 2 - Track matching and recover from outcomes (Priority: P1)

**Goal**: Synchronize interests after confirmation, create one matching operation, track its process safely, and provide accurate summaries and retry behavior.

**Independent Test**: Confirm a valid session with mixed interest states, then exercise individual add failures, successful submission, pending/running, terminal and unknown statuses, polling errors, navigation/reload, and report retrieval failure; verify no duplicate submission.

### Tests for User Story 2

- [x] T014 Add store tests for confirmation locking, profile re-check, interest-add ordering, no duplicate add attempts, per-job exclusions, interest refresh, all-adds-failed behavior, and a single matching request in `src/app/core/state/matching-store.spec.ts`.
- [x] T015 Add store tests for serialized process polling, known and unknown statuses, immediate terminal responses, network errors, stale responses, navigation cleanup/resume, and missing/unavailable reports in `src/app/core/state/matching-store.spec.ts`.
- [x] T016 Add session-page tests for progress/terminal summaries, report reload without resubmission, recoverable polling warnings, and retry prefill that excludes established successes in `src/app/pages/matching-session/matching-session.spec.ts`.

### Implementation for User Story 2

- [x] T017 Implement confirmation locking, profile re-check, interest synchronization/refresh, per-job failure tracking, and one eligible-job submission in `src/app/core/state/matching-store.ts`.
- [x] T018 Implement one non-overlapping process poll lifecycle using the processing identifier, preserve unknown/error states, resume after return/reload, stop on confirmed terminal status, and load the associated report in `src/app/core/state/matching-store.ts`.
- [x] T019 Add progress, failure, completed-report, report-load-error, and user-confirmed retry views/actions to `src/app/pages/matching-session/matching-session.ts` and `src/app/pages/matching-session/matching-session.html`.

**Checkpoint**: A confirmed session produces at most one matching operation; tracking errors and unknown statuses never become false success/failure, and retry never silently submits.

---

## Phase 5: User Story 3 - View and manage matching reports (Priority: P2)

**Goal**: Let users independently browse report history, inspect current or legacy results, and safely delete eligible reports.

**Independent Test**: Open empty and populated history, inspect a report with current, null, and legacy data, then delete a terminal report and verify history refresh and no effects on interests or normalized jobs.

### Tests for User Story 3

- [x] T020 [P] Add report parsing, current/legacy-shape detection, result-ordering, null score/rank, and safe-fallback tests using the documented provisional examples in `src/app/core/models/matching.spec.ts`.
- [x] T021 [P] Add report-history page tests for empty state, available metadata, navigation to one report's detail, and no detail-call fan-out in `src/app/pages/matching-reports/matching-reports.spec.ts`.
- [x] T022 Add report-detail tests for job metadata fallback, current-format sections, eligibility separation, qualitative chance-of-success display, legacy rendering, inaccessible/empty reports, profile-version comparison, and deletion restrictions in `src/app/pages/matching-reports/matching-report-detail.spec.ts`. Deletion remains unavailable until report terminal statuses are verified.

### Implementation for User Story 3

- [x] T023 Implement current-format structural validation, safe legacy classification, and stable backend-rank ordering without score/rank recalculation in `src/app/core/models/matching.ts`.
- [x] T024 Build the independent report-history view using provisional list metadata and no invented pagination/order behavior in `src/app/pages/matching-reports/matching-reports.ts`, `src/app/pages/matching-reports/matching-reports.html`, and `src/app/pages/matching-reports/matching-reports.scss`.
- [x] T025 Build report-detail rendering, job metadata fallback, profile-identifier comparison, and retrieval retry in `src/app/pages/matching-reports/matching-report-detail.ts`, `src/app/pages/matching-reports/matching-report-detail.html`, and `src/app/pages/matching-reports/matching-report-detail.scss`. Keep deletion disabled until the report terminal-status contract is known.

**Checkpoint**: Report history works without an active session; current and legacy details are truthful, and deletion affects only the selected report.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integrate navigation and verify the complete feature against project checks.

- [x] T026 Add the report-history/detail routes and authenticated-shell navigation link using the existing route conventions in `src/app/app.routes.ts` and `src/app/app.html`, preserving the session route established by T013.
- [x] T027 Run available automated validation (`npm test -- --watch=false`, `npm run build`, and isolated pure-model tests), record actual outcomes, and document manual backend scenarios deferred because no backend contract/account is available in `specs/006-matching-session-reports/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001; no feature-code dependencies.
- **Foundational (Phase 2)**: T002 is a hard backend-contract gate. T003 and T004 can proceed in parallel after T002. T005 depends on T003 and T004.
- **User Stories (Phases 3–5)**: Begin only after the foundational API and model work is complete.
- **Polish (Phase 6)**: T026 follows the page implementations; T027 follows all desired stories and route integration.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2. It delivers selection, persistence, and review independently of submission processing.
- **User Story 2 (P1)**: Depends on User Story 1 because confirmation and recovery extend the same session lifecycle and screen.
- **User Story 3 (P2)**: Depends on Phase 2 only. Report history/detail work can proceed in parallel with US1/US2 after shared contracts and models are established; its final route/navigation integration is T026 and follows the shared route-file change in T013.

### Within Each User Story

- Write story tests before implementing their behavior and use actual service fixtures.
- In US1, the store behavior precedes entry actions and review-screen integration.
- In US2, test and implement interest synchronization before process-tracking behavior; add UI summaries after store transitions are available.
- In US3, validate result shapes and test views before implementing result rendering and deletion.

### Parallel Opportunities

- After T002, T003 and T004 touch separate files and can run in parallel.
- The T007 and T008 source-page tests can run in parallel; after the store (T010), T011 and T012 can proceed in parallel after their respective tests.
- After the shared foundation, US3 page/model tasks can proceed independently of US1/US2 apart from final route integration; T026 follows T013 to avoid concurrent edits to `src/app/app.routes.ts`.
- In US3, T020 and T021 use separate test files and can run in parallel after T005; T022 follows the shared detail model and test fixture decisions.

## Parallel Example: User Story 1

```text
The entry-point tests can be written in parallel:
Task: T007 - Add the Normalized Jobs session-entry test in src/app/pages/normalized-jobs/normalized-jobs.spec.ts
Task: T008 - Add the My Interests session-entry test in src/app/pages/interests/interests.spec.ts

After T010 and both tests are complete, implement the independent page actions in parallel:
Task: T011 - Implement the Normalized Jobs session-entry action in src/app/pages/normalized-jobs/normalized-jobs.ts and src/app/pages/normalized-jobs/normalized-jobs.html
Task: T012 - Implement the My Interests session-entry action in src/app/pages/interests/interests.ts and src/app/pages/interests/interests.html
```

## Implementation Strategy

### MVP Scope

Deliver User Stories 1 and 2 together as the first end-to-end matching increment: session assembly/review alone does not complete the user's matching goal. Keep User Story 3 as a subsequent increment; report loading/retry required by the just-completed process remains part of US2.

### Incremental Delivery

1. Complete setup and the contract-gated shared API foundation.
2. Deliver US1 and independently validate session assembly, review, and persistence.
3. Deliver US2 and validate interest synchronization, one-operation submission, polling, recovery, and retry.
4. Deliver US3 and validate report history, details, legacy fallback, and deletion.
5. Complete route/navigation integration and run the quickstart/build/test checks.

### Parallel Team Strategy

Complete T001–T005 together first. After T005, assign US1 and US3 to separate contributors if desired. US2 follows US1 because it extends the same session store and review page. Keep T026 route/shell integration to one contributor to avoid conflicts in shared navigation files.

## Notes

- Every task has the required checkbox, sequential task ID, applicable parallel marker, required story label for story-phase tasks, and explicit file path.
- `[P]` appears only where tasks use separate files and can proceed without an unfinished task dependency.
- T002 is marked complete because the user explicitly directed implementation to use the feature-brief model despite the absence of server schemas; this is not independent backend verification.
- No backend endpoint, response value, report status, batch limit, duplicate-interest success behavior, or retry classification may be invented to unblock implementation.

## Phase 7: Convergence

- [x] T028 Preserve the last recognized process status when a poll returns an unknown status, display the raw unknown value separately, and provide a recovery path per FR-016 (partial).
- [ ] T029 Apply verified report retry semantics to failed and completed operations; prefill only jobs not submitted or verified as unsuccessful, exclude established successes, and avoid claims for unclassifiable results per FR-020 (partial).
- [ ] T030 Verify report terminal-status semantics, then implement eligibility-gated deletion with permanent-removal confirmation, active-process restrictions, failure retention, successful history refresh, and detail exit per FR-028–029 (partial).

## Phase 8: Convergence

- [ ] T031 Obtain and record verified scoring-status and retry-classification semantics, then complete report-backed retry selection for failed and completed operations per FR-020 (partial).
- [ ] T032 Obtain and record verified report terminal-status semantics, then complete safe report deletion eligibility and lifecycle behavior per FR-028–029 (partial).
