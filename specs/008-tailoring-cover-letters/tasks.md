---
description: "Implementation tasks for optional cover letters in tailoring sessions"
---

# Tasks: Optional Cover Letters in Tailoring Sessions

**Input**: Design documents in `specs/008-tailoring-cover-letters/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/tailoring-cover-letter.md`

**Tests**: Test tasks are included to verify the specification's independent test criteria and the plan's focused coverage requirements.

**Organization**: Tasks are grouped by user story and priority. The repository is already initialized; no dependencies or project configuration changes are required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel with other marked tasks because it affects different files and has no incomplete-task dependency.
- **[Story]**: Maps the task to a user story in `spec.md`.
- Every task names its target file path.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure.

No setup task is required. The existing Angular application, dependencies, tailoring routes, API service, and test harness are already in place.

---

## Phase 2: Foundational

**Purpose**: Define shared request and document types needed by every user story.

- [X] T001 Extend `TailoringInput`, `TailoringRequest`, and `TailoredDocument` with typed cover-letter options and the `cover_letter` document kind in `src/app/core/models/tailored-cv.ts`.

**Checkpoint**: Shared client types are ready before setup, result, and retry work begins.

---

## Phase 3: User Story 1 - Generate a cover letter with a tailoring session (Priority: P1) 🎯 MVP

**Goal**: Let the candidate opt into letters, choose a mode independently, and submit both outputs in the existing request.

**Independent Test**: Select multiple jobs, profile, and language; exercise both CV modes with both letter modes; verify the request carries the shared context, independent modes, and the expected output counts. Confirm disabled sessions retain the CV-only request.

### Tests for User Story 1

- [X] T002 [P] [US1] Add exact request-body coverage for enabled letters in both modes and the unchanged disabled request in `src/app/core/api/tailoring-api.spec.ts`.
- [X] T003 [P] [US1] Add store coverage for the off-by-default toggle, independent modes, output counts, shared context, and single submission in `src/app/core/state/tailored-cv-store.spec.ts`.
- [X] T004 [P] [US1] Add review-component coverage for letter enablement, independent mode, and CV/letter document counts in `src/app/pages/tailored-cvs/tailored-cv-confirmation/tailoring-confirmation.spec.ts`.

### Implementation for User Story 1

- [X] T005 [US1] Add disabled-by-default letter state, `per_job` letter-mode default, independent request serialization, and setup controls in `src/app/core/state/tailored-cv-store.ts`, `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.ts`, and `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.html`.
- [X] T006 [US1] Show both output settings and their document counts in the confirmation review, and wire the new inputs from setup in `src/app/pages/tailored-cvs/tailored-cv-confirmation/tailored-cv-confirmation.ts`, `src/app/pages/tailored-cvs/tailored-cv-confirmation/tailored-cv-confirmation.html`, and `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.html`.

**Checkpoint**: A candidate can review and submit an existing tailoring session with either output mode combination, while disabled letters preserve the current CV-only body.

---

## Phase 4: User Story 2 - Review and retrieve session outputs (Priority: P2)

**Goal**: Display each letter beside CVs in request and history views and use the existing preview/download flow.

**Independent Test**: Open a request containing completed and failed CV/letter documents; verify type, targets, status, errors, profile context, preview availability, and download for completed letters from request and history.

### Tests for User Story 2

- [X] T007 [P] [US2] Add request-detail coverage for CV and cover-letter document cards, independent outcomes, target jobs, and completed-only actions in `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.spec.ts`.
- [X] T008 [P] [US2] Add history coverage for letter documents, profile/job association, completed downloads, and loading details for failed requests in `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.spec.ts`.
- [X] T009 [P] [US2] Add preview coverage for completed letters and generic document context using the existing document route in `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.spec.ts`.

### Implementation for User Story 2

- [X] T010 [P] [US2] Render cover-letter documents alongside CV documents with independent status/error/warning, associated jobs, and completed-only preview/download actions in `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.html`.
- [X] T011 [P] [US2] Load document details for failed terminal requests and render cover-letter documents using the existing history actions in `src/app/core/state/tailored-cv-store.ts` and `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.html`.
- [X] T012 [P] [US2] Generalize document lookup, error text, headings, and metadata in the existing preview page without adding a route in `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.ts` and `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.html`.

**Checkpoint**: Request detail, history, and the existing preview route expose letter outcomes and completed letter documents next to CVs.

---

## Phase 5: User Story 3 - Preserve independent output outcomes (Priority: P3)

**Goal**: Preserve successful documents when another output fails, retain letter settings on supported whole-request retry, and avoid duplicate submissions.

**Independent Test**: Verify mixed-success documents remain independently available; retry a fully failed letter-enabled request and verify its original settings are resent; confirm partial requests do not offer unsupported per-output retry and repeated pending submissions remain blocked.

### Tests for User Story 3

- [X] T013 [US3] Add coverage for retrying a failed letter-enabled request with its original mode, blocking retry for partial requests, and preventing duplicate submission in `src/app/core/state/tailored-cv-store.spec.ts`.

### Implementation for User Story 3

- [X] T014 [US3] Preserve the original cover-letter enablement and mode during whole-request retry, keep retry limited to failed requests, and show both modes in retry review in `src/app/core/state/tailored-cv-store.ts`, `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.ts`, `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.html`, and `src/app/pages/tailored-cvs/tailored-cv-confirmation/tailored-cv-confirmation.html`.

**Checkpoint**: Mixed results remain available, retries preserve original settings only where supported, and duplicate guards remain in effect.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature against its contract and user scenarios.

- [X] T015 Run the full client test suite and production build using the commands in `package.json` and `specs/008-tailoring-cover-letters/quickstart.md`. The production build passes; the full test suite is blocked by pre-existing type errors in unrelated application-journal and normalized-job specs. All focused tailoring tests pass.
- [ ] T016 Execute the end-to-end scenarios in `specs/008-tailoring-cover-letters/quickstart.md` against a backend that supports the verified contract; verify the client sends the expected request and renders returned document outcomes. Not run: this workspace has no configured authenticated backend/test account.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No initialization changes are needed.
- **Foundational (Phase 2)**: T001 must complete before user-story work because all flows share the request and document types.
- **User Stories (Phases 3–5)**: Complete in priority order. US2 and US3 touch the same store and request flows as earlier stories, so implementation is sequenced to avoid conflicting edits.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; establishes letter configuration and request submission.
- **US2 (P2)**: Starts after US1; adds results/history/preview support for the outputs created by US1.
- **US3 (P3)**: Starts after US2; modifies the shared request store and retry review to preserve letter configuration and outcomes.

### Within Each User Story

- Add the story's focused tests before its implementation tasks.
- Complete T005 before T006 because setup binds the confirmation component's new inputs.
- After US2 tests T007–T009 complete, T010–T012 can run in parallel because they update separate views/state surfaces.
- Complete T013 before changing retry behavior in T014.

### Parallel Opportunities

- After T001, T002, T003, and T004 can run in parallel because each updates a different test file.
- After US1, T007, T008, and T009 can run in parallel because each updates a different view test file.
- After US2 tests complete, T010, T011, and T012 can run in parallel because they update request detail, history/store, and preview respectively.
- User-story phases themselves remain sequential because they modify shared session and request state.

## Parallel Examples

### User Story 1

```text
Run T002 in src/app/core/api/tailoring-api.spec.ts
Run T003 in src/app/core/state/tailored-cv-store.spec.ts
Run T004 in src/app/pages/tailored-cvs/tailored-cv-confirmation/tailoring-confirmation.spec.ts
```

### User Story 2

```text
Run T007 in src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.spec.ts
Run T008 in src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.spec.ts
Run T009 in src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.spec.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 to establish the shared request/document types.
2. Complete US1 tests and setup/review implementation.
3. Validate request payloads and independent document counts against the verified service contract.
4. Continue with US2 before treating the feature as user-ready, so letters are visible and retrievable.

### Incremental Delivery

1. Establish shared types, then deliver US1 configuration and same-request submission.
2. Deliver US2 request/history visibility and existing preview/download support.
3. Deliver US3 independent failure display and whole-request retry preservation.
4. Run automated and end-to-end validation from the quickstart.
