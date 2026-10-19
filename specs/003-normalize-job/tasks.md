---

description: "Task list for Normalize Job Submission implementation"
---

# Tasks: Normalize Job Submission

**Input**: Design documents from `/specs/003-normalize-job/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/normalize-job.md, quickstart.md

**Tests**: Included — quickstart.md defines explicit test coverage expectations, and the project tests with Vitest via the Angular test builder.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Angular application: source under `src/app/` (models/API/state in `src/app/core/`, pages in `src/app/pages/`), specs colocated as `*.spec.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Domain types and API client surface shared by all user stories

- [X] T001 [P] Create normalization domain types in src/app/core/models/normalization.ts: `NormalizeJobRequest` ({ url, content }), `NormalizationJob` (submit response: id, status, processing_job_id, title, url, created_at), `ProcessingJob` (poll response: id, status 'pending'|'processing'|'completed'|'failed', result_id, error), `SubmissionStatus` ('submitting'|'pending'|'processing'|'completed'|'failed'), and `NormalizationSubmission` (client view model per data-model.md)
- [X] T002 Add `normalizeJob(request: NormalizeJobRequest): Observable<NormalizationJob>` (POST `${baseUrl}/jobs/normalize`) and `getProcessingJob(processingJobId: string): Observable<ProcessingJob>` (GET `${baseUrl}/processing-jobs/{id}` with encodeURIComponent) to src/app/core/api/tip-api.ts (depends on T001)
- [X] T003 Add HTTP unit tests for `normalizeJob` and `getProcessingJob` (request shape incl. stringified content, URL, response mapping, ID encoding) in src/app/core/api/tip-api.spec.ts (depends on T002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The root-provided hybrid state store that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Write NormalizationStore unit tests in src/app/core/state/normalization-store.spec.ts covering: submit() transitions a submission through 'submitting' → polling statuses → terminal; polling stops on 'completed'/'failed'; null `processing_job_id` resolves terminally without polling; `inProgressCount`/`hasInProgress` computed values; `dismiss()` removes terminal submissions. Mock TipApi and RxJS timers (fakeAsync/tick or Vitest fake timers). Tests MUST fail before T005
- [X] T005 Implement NormalizationStore in src/app/core/state/normalization-store.ts as a root-provided @ngrx/signals store: `submissions` signal (newest first), `inProgressCount` and `hasInProgress` computed signals, `submit(url, rawContent)` (validates non-empty inputs, POSTs via TipApi with `JSON.stringify(rawContent)`, then starts a per-submission RxJS poll: `timer(0, 2000).pipe(switchMap(...), takeUntil(terminal))`), `dismiss(submissionId)`, and transport-error handling that keeps polling without losing the submission (per research.md R1–R2)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Submit Job Content for Normalization (Priority: P1) 🎯 MVP

**Goal**: User submits a URL + content on the Normalize Job page and gets spinner → completed (link to normalized job) or failed (error message) feedback; invalid input is blocked.

**Independent Test**: Navigate to `/normalize-job`, submit valid input, observe spinner and final completed/failed state; attempt an empty submission and verify it is blocked (quickstart VS1, VS2, VS6).

### Tests for User Story 1 ⚠️

- [X] T006 [US1] Write component spec for the normalize-job page in src/app/pages/normalize-job/normalize-job.spec.ts covering: submit button disabled/blocked with empty URL or content, spinner shown while a submission is non-terminal, error message shown on failure, success state with link to `/normalized-jobs/{resultId}` on completion. Mock NormalizationStore. Tests MUST fail before T007

### Implementation for User Story 1

- [X] T007 [US1] Create the standalone `NormalizeJob` component class in src/app/pages/normalize-job/normalize-job.ts: reactive form (url, content), non-empty validation (FR-013), `submit()` delegating to NormalizationStore, exposed store signals for the template
- [X] T008 [US1] Create the page template in src/app/pages/normalize-job/normalize-job.html: URL + content inputs with validation messages, submit action, per-submission spinner while status is non-terminal, error message on 'failed', success state with RouterLink to `/normalized-jobs/{resultId}` (fallback: submit response job id) on 'completed' (FR-004, FR-005, FR-006)
- [X] T009 [P] [US1] Create page styles in src/app/pages/normalize-job/normalize-job.scss using Bootstrap 5.3 conventions consistent with existing pages
- [X] T010 [US1] Register the lazy `/normalize-job` route in src/app/app.routes.ts using `loadComponent` (pattern from the `normalized-jobs` routes) (depends on T007)

**Checkpoint**: User Story 1 fully functional — submit, spinner, success link, error, validation (VS1, VS2, VS6)

---

## Phase 4: User Story 2 - Submit Multiple Requests Concurrently (Priority: P2)

**Goal**: User can submit additional normalization requests while previous ones are still processing; each is tracked with its own spinner and outcome.

**Independent Test**: Submit three requests in quick succession; verify three independent statuses that each resolve on their own (quickstart VS3).

### Tests for User Story 2 ⚠️

- [X] T011 [US2] Add NormalizationStore concurrency tests in src/app/core/state/normalization-store.spec.ts: multiple submissions poll independently, one reaching a terminal state does not affect the others, and `inProgressCount` reflects each transition. Tests MUST fail before T012

### Implementation for User Story 2

- [X] T012 [US2] Update src/app/pages/normalize-job/normalize-job.ts and src/app/pages/normalize-job/normalize-job.html so the submission form remains usable while submissions are in flight (form is not disabled by non-terminal submissions) and all in-flight/terminal submissions render as an independent status list (FR-007)
- [X] T013 [US2] Verify/adjust NormalizationStore polling in src/app/core/state/normalization-store.ts so each submission owns its poll stream (keyed by submission id) with no shared cancellation across submissions

**Checkpoint**: User Stories 1 AND 2 both work independently (VS1–VS3, VS6)

---

## Phase 5: User Story 3 - Track Normalization Jobs from the Dashboard (Priority: P3)

**Goal**: Dashboard and normalized-jobs listing link to the Normalize Job page; the dashboard lists all normalization jobs with statuses and an in-progress count; leaving/reloading never loses a submission.

**Independent Test**: Start a normalization, leave the page (and separately, reload the browser), return via the dashboard; the job appears with its latest status, the in-progress count matches, and completed jobs open their detail view (quickstart VS4, VS5, VS7).

### Tests for User Story 3 ⚠️

- [X] T014 [P] [US3] Add persistence tests to src/app/core/state/normalization-store.spec.ts: in-flight submissions are written to localStorage (`tip.normalization.inflight`), removed on terminal state, and restored on store init with polling resumed. Tests MUST fail before T016
- [X] T015 [P] [US3] Extend dashboard spec in src/app/pages/dashboard/dashboard.spec.ts: normalize link renders and routes to `/normalize-job`, normalization jobs list shows submissions with statuses, in-progress count matches store state. Mock NormalizationStore. Tests MUST fail before T017

### Implementation for User Story 3

- [X] T016 [US3] Add localStorage persistence to src/app/core/state/normalization-store.ts: persist `{ id, jobId, processingJobId, url, submittedAt }` for in-flight submissions, remove on terminal state, restore and resume polling on store initialization (research.md R3, FR-008, FR-014)
- [X] T017 [US3] Update src/app/pages/dashboard/dashboard.ts and src/app/pages/dashboard/dashboard.html: add a "Normalize job" RouterLink to `/normalize-job` (FR-009), render the normalization submissions list with per-job status linking completed jobs to `/normalized-jobs/{resultId}` (FR-011), and display the in-progress count from `NormalizationStore.inProgressCount` (FR-012)
- [X] T018 [P] [US3] Add a "Normalize job" RouterLink to `/normalize-job` in src/app/pages/normalized-jobs/normalized-jobs.html (FR-010) and cover it in src/app/pages/normalized-jobs/normalized-jobs.spec.ts

**Checkpoint**: All user stories independently functional (VS1–VS7)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across the whole feature

- [X] T019 Run the full test suite (`npm test`) and fix any regressions in existing specs (app, dashboard, normalized-jobs, tip-api)
- [X] T020 Run the production build (`npm run build`) and resolve any errors (budgets, template type checks)
- [X] T021 [P] Run Prettier over all new/modified files per repo conventions
- [ ] T022 Validate quickstart.md scenarios VS1–VS7 end-to-end against a running backend (`npm start`), including page-leave and browser-reload continuity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001–T002 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2
- **User Story 2 (Phase 4)**: Depends on Phase 2; builds on US1's page but store concurrency is verifiable from T011 alone
- **User Story 3 (Phase 5)**: Depends on Phase 2; US1's route must exist for link navigation checks
- **Polish (Phase 6)**: Depends on all desired stories

### User Story Dependency Graph

```text
Phase 1 (Setup) ──► Phase 2 (Foundational store) ──► US1 (Submit + feedback) 🎯 MVP
                                                   ──► US2 (Concurrency; page extends US1)
                                                   ──► US3 (Dashboard/persistence; links to US1 route)
```

### Parallel Opportunities

- T001 (models) is the only fully independent setup task; T002/T003 chain after it
- Within US1: T009 (styles) can run parallel with T007/T008
- Within US3: T014 ∥ T015 (different spec files); T018 (normalized-jobs link) is independent of T016/T017
- After Phase 2, US1/US2 store-level work and US3 persistence work can proceed in parallel if coordinated on normalization-store.ts (US2's T013 and US3's T016 touch the same file — sequence those two)

### Parallel Example: User Story 3

```text
Together:  T014 (store persistence tests) + T015 (dashboard spec) + T018 (listing link)
Then:      T016 (store persistence impl)
Then:      T017 (dashboard impl)
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T005)
3. Complete Phase 3: User Story 1 (T006–T010)
4. **STOP and VALIDATE**: quickstart VS1, VS2, VS6 — submit, spinner, success link, error, validation
5. Deploy/demo a working submission flow

### Incremental Delivery

1. Setup + Foundational → store and API ready
2. Add US1 → validate VS1/VS2/VS6 → MVP
3. Add US2 → validate VS3 → concurrent batch submissions
4. Add US3 → validate VS4/VS5/VS7 → dashboard tracking and reload continuity
5. Polish → full suite green, production build clean

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Story tests are written before implementation within each phase (per quickstart coverage expectations)
- T013 and T016 both edit normalization-store.ts — do not run them concurrently
- Each checkpoint maps to quickstart.md validation scenarios; verify before moving on

---

## Phase 7: Convergence

- [X] T023 Persist full submission history (including terminal submissions) in localStorage and restore terminal records on store init without resuming polling, so the dashboard lists all previously submitted normalization jobs after a reload per FR-011, SC-004, US3/AC4 (partial) � update src/app/core/state/normalization-store.ts, src/app/core/state/normalization-store.spec.ts, and the restore/persistence helpers
- [X] T024 Surface a recoverable per-submission "status check failed � retrying" indicator when polling encounters a transport error (while continuing to poll) per contracts/normalize-job.md (partial) � update src/app/core/state/normalization-store.ts, src/app/pages/normalize-job/normalize-job.html, and related specs
