# Tasks: Application Journal UI

**Input**: Design documents from `/specs/005-application-journal/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/application-api.md`

**Tests**: Included because the feature requirements explicitly request automated test scenarios.

**Organization**: Tasks are grouped by user story to permit incremental, independently testable delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the phase because it touches separate files and has no incomplete dependency.
- **[Story]**: Maps the task to a user story in `spec.md`.
- Each task identifies the exact source or test file to change.

## Phase 1: Setup

**Purpose**: Feature design artifacts and current application structure are established. No package or tooling changes are needed.

- [x] T001 Record application route, working payload assumptions, and confirmation/deletion boundaries in `specs/005-application-journal/contracts/application-api.md`

## Phase 2: Foundational

**Purpose**: Define the shared, typed application-journal data contract required by all user stories.

- [x] T002 [P] Define application entry, normalized job header, filters, pagination, supported statuses, create/update requests, and immutable history types in `src/app/core/models/application-journal.ts`
- [x] T003 Document the assumed `ApplicationStatus` wire values and mark backend schema verification as a release dependency in `specs/005-application-journal/contracts/application-api.md` and `specs/005-application-journal/data-model.md`

**Checkpoint**: Shared data types and the explicitly documented status assumption are ready; verify serialized values against the backend before release.

## Phase 3: User Story 1 - Browse and find applications (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can browse their own applications, filter server-side, paginate, and recover from loading failures.

**Independent Test**: Load a mocked paginated response, apply combined filters, change page and page size, simulate stale requests, empty results, failure/retry, and verify returned ordering and metadata.

### Tests for User Story 1

- [x] T004 [P] [US1] Add `listApplications` HTTP tests for default page/limit, trimmed combined filters, and returned metadata in `src/app/core/api/tip-api.spec.ts`
- [x] T005 [P] [US1] Add list-page tests for loading/empty/error/retry, URL query parsing, debounce, combined filters, page-size reset, stale cancellation, deletion-adjusted page state, and unchanged backend order in `src/app/pages/application-journal/application-journal.spec.ts`

### Implementation for User Story 1

- [x] T006 [US1] Implement typed listing query/response mapping and `listApplications` against `GET /applications/` in `src/app/core/api/tip-api.ts`
- [x] T007 [US1] Implement the authenticated application list with debounced server filters, URL-backed pagination, retry/error/empty states, and backend ordering in `src/app/pages/application-journal/application-journal.ts`
- [x] T008 [P] [US1] Render available job header, source link, status, recruiter/contact/follow-up details, and accessible loading/list/pagination states in `src/app/pages/application-journal/application-journal.html`
- [x] T009 [P] [US1] Style the application list, filters, pagination, and responsive layout in `src/app/pages/application-journal/application-journal.scss`
- [x] T010 [US1] Add guarded `/applications` list routing and navigation link in `src/app/app.routes.ts` and `src/app/app.html`

**Checkpoint**: The user can independently list/filter/page through their applications and receive appropriate retry feedback.

## Phase 4: User Story 2 - Record and maintain an application (Priority: P1)

**Goal**: Users can select any normalized job, create an application, and edit only ordinary editable fields.

**Independent Test**: Select a normalized job, create and edit a record, verify the request payloads, verify no interest deletion request occurs, and cover duplicate, validation, network, and pending-submit behavior.

### Tests for User Story 2

- [x] T011 [P] [US2] Add HTTP tests for get/create/update application endpoints, snake_case request fields, identifier encoding, and mapped detail response in `src/app/core/api/tip-api.spec.ts`
- [x] T012 [P] [US2] Add entry-page tests for create/edit forms, normalized-job search and selection, default status omission, validation/duplicate errors, preserved form values, and duplicate-submit prevention in `src/app/pages/application-journal/application-journal-entry.spec.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement application response mapping plus `getApplication`, `createApplication`, and `updateApplication` in `src/app/core/api/tip-api.ts`
- [x] T014 [US2] Implement `/applications/new` and `/applications/:id` entry loading, typed reactive forms, and normalized-job selector using `listNormalizedJobs` in `src/app/pages/application-journal/application-journal-entry.ts`
- [x] T015 [P] [US2] Render job search/results, job header, create/edit fields, accessible validation/errors, and pending-submit feedback in `src/app/pages/application-journal/application-journal-entry.html`
- [x] T016 [P] [US2] Style the create/edit/detail form and normalized-job selector in `src/app/pages/application-journal/application-journal-entry.scss`
- [x] T017 [US2] Add guarded `/applications/new` and `/applications/:id` routes in `src/app/app.routes.ts`

**Checkpoint**: A user can create and edit an application; creation does not call interest deletion.

## Phase 5: User Story 3 - Update status and review history (Priority: P1)

**Goal**: Users can set any supported status, optionally explain the change, and review immutable backend history.

**Independent Test**: Submit supported status values with and without notes, reload entry detail after success, verify status/history match, and confirm history offers no mutation controls.

### Tests for User Story 3

- [x] T018 [P] [US3] Add status PATCH HTTP tests for exact status values, optional note behavior, and encoded application identifier in `src/app/core/api/tip-api.spec.ts`
- [x] T019 [P] [US3] Add entry-detail tests for status labels/values, optional notes, authoritative reload, chronological read-only history, pending state, and update failures in `src/app/pages/application-journal/application-journal-entry.spec.ts`

### Implementation for User Story 3

- [x] T020 [US3] Implement `updateApplicationStatus` through `PATCH /applications/{application_id}/status` in `src/app/core/api/tip-api.ts`
- [x] T021 [US3] Add status selection and optional note submission, then reload backend entry/history after success in `src/app/pages/application-journal/application-journal-entry.ts`
- [x] T022 [US3] Render current status and immutable chronological history events with timestamps and optional notes in `src/app/pages/application-journal/application-journal-entry.html`

**Checkpoint**: Current status and read-only status history reflect backend data after updates.

## Phase 6: User Story 4 - Delete an application entry (Priority: P2)

**Goal**: Users can delete an application entry with confirmation while leaving the normalized job and interests untouched.

**Independent Test**: Cancel and confirm deletion; verify only the application delete operation is called, errors retain the entry, and the list returns to a valid page.

### Tests for User Story 4

- [x] T023 [P] [US4] Add delete HTTP tests for method/path and successful no-content response in `src/app/core/api/tip-api.spec.ts`
- [x] T024 [P] [US4] Add delete confirmation/cancel/pending/failure tests and assert no normalized-job or interest mutation in `src/app/pages/application-journal/application-journal-entry.spec.ts`

### Implementation for User Story 4

- [x] T025 [US4] Implement `deleteApplication` against `DELETE /applications/{application_id}/` in `src/app/core/api/tip-api.ts`
- [x] T026 [US4] Add confirmed deletion flow and navigation back to the application list in `src/app/pages/application-journal/application-journal-entry.ts` and `src/app/pages/application-journal/application-journal-entry.html`
- [x] T027 [US4] Navigate back to the application list after deletion so it reloads at a valid page in `src/app/pages/application-journal/application-journal-entry.ts`

**Checkpoint**: Deleting an application affects only its journal record and returns users to a valid list view.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate complete coverage and align documentation with the actual wire contract.

- [x] T028 [P] Document confirmed routes and explicitly mark unverified backend request/response/status schemas in `specs/005-application-journal/contracts/application-api.md` and `specs/005-application-journal/data-model.md`
- [x] T029 [P] Complete UI behavior, API integration, and automated scenario documentation in `specs/005-application-journal/quickstart.md`
- [x] T030 Run focused and full tests; verify journal tests pass and record unrelated profile editor failures from the full suite
- [x] T031 Run `npm run build`; verify compilation succeeds and record the bundle-budget warning

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Complete; no runtime dependencies are added.
- **Foundational (Phase 2)**: Required before API and component work. The enum encoding is an explicit assumption to verify against the backend before release.
- **User Stories (Phases 3-6)**: US1 can begin once foundational types are ready. US2 can proceed independently of the list page after shared models; US3 depends on the entry/detail component from US2; US4 depends on the entry/detail and list routes.
- **Polish (Phase 7)**: Depends on all delivered stories and backend contract verification.

### User Story Dependencies

- **US1 (P1)**: Independent after shared model types; delivers the MVP listing slice.
- **US2 (P1)**: Independent after shared types; creates the detail route consumed by US3 and US4.
- **US3 (P1)**: Builds on the entry/detail view from US2.
- **US4 (P2)**: Builds on the entry/detail and list views from US1/US2.

### Parallel Opportunities

- T004 and T005 can be written in parallel because they modify separate tests.
- T008 and T009 can be implemented in parallel after the listing state contract exists.
- T011 and T012 can be written in parallel because they modify separate tests.
- T015 and T016 can be implemented in parallel after the entry state contract exists.
- T018 and T019 can be written in parallel because they modify separate tests.
- T023 and T024 can be written in parallel because they modify separate tests.
- US1 and US2 implementation can proceed in parallel after T002/T003 if the shared model contract is stable; US3/US4 wait for the entry/detail route and list route respectively.

## Parallel Example: User Story 1

```text
Task: T004 API listing contract tests in src/app/core/api/tip-api.spec.ts
Task: T005 Listing component behavior tests in src/app/pages/application-journal/application-journal.spec.ts

After the listing state contract is agreed:
Task: T008 Listing template in src/app/pages/application-journal/application-journal.html
Task: T009 Listing styles in src/app/pages/application-journal/application-journal.scss
```

## Implementation Strategy

1. Establish shared models and document status wire-value assumptions.
2. Deliver the list/filter/pagination slice as the MVP.
3. Add job selection and create/edit functionality.
4. Add status updates and immutable history.
5. Add confirmed deletion.
6. Align docs to backend schema and run the full test suite and production build.

## Verification Results

- Focused journal API and component tests: **39 passed** across 3 test files.
- Full frontend suite: **131 passed; 3 failed** in `src/app/pages/profile/profile-section-editors.spec.ts` (certificate, education, and work-experience editor casing expectations). These failures are outside the application journal files.
- Production build: **succeeded**. Angular reported that the initial bundle is 20.67 kB above the configured 600 kB warning budget.
- The backend's request/response schema and serialized status values were not available in this frontend repository; assumptions are documented in `contracts/application-api.md` and must be checked before release.
