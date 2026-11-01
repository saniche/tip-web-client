# Tasks: Job-Specific CV Tailoring

**Input**: Design documents from `specs/007-job-cv-tailoring/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, and `contracts/cv-tailoring.md`

**Tests**: No separate test-writing tasks are included; the feature specification does not explicitly require TDD or test-first implementation. Each story includes independent validation criteria, and final verification uses the existing client test/build commands.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated against its acceptance scenarios.

## Phase 1: Setup

**Purpose**: The repository is already an initialized Angular application with dependencies and API configuration. No project initialization or new infrastructure is required.

## Phase 2: Foundational

**Purpose**: Add the shared typed API surface required by all user stories before implementing user-facing workflows.

- [X] T001 Define profile-version, tailoring request/response, processing status, request history, and tailored-document types in `src/app/core/models/tailored-cv.ts`
- [X] T002 Add typed `TipApi` methods for listing profile versions, creating/listing/retrieving tailoring requests, getting processing-job status, and retrieving authenticated Markdown documents in `src/app/core/api/tip-api.ts`

**Checkpoint**: Shared client models and API calls match `specs/007-job-cv-tailoring/contracts/cv-tailoring.md`; no backend or document-generation infrastructure is added.

## Phase 3: User Story 1 - Configure and start CV tailoring (Priority: P1)

**Goal**: Start tailoring from a normalized job or matching report using the permitted jobs, profile, mode, and language.

**Independent Test**: From an authenticated account with a usable profile, start from a normalized job and a matching report. Verify the setup context and final POST body use the expected job IDs, profile ID, mode, and language, disable cover letters, and prevent duplicate submissions. Confirm report-launched setup locks the report's profile and blocks submission if that profile is unavailable.

### Implementation

- [X] T003 Implement Signals-based tailoring setup state, source-context loading, input validation, and single-submit behavior in `src/app/core/state/tailored-cv-store.ts`; use only valid source job IDs, require a usable profile, lock the report-associated profile for report launches, default mode to `per_job`, initialize editable language from the applicable profile, and submit only the selected IDs/options with `cover_letter.enabled: false`
- [X] T004 Create the setup form, loading/empty/error states, job selection, profile and mode controls, language editing, and document-count guidance in `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.ts`, `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.html`, and `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.scss`
- [X] T005 Add authenticated lazy routes for job-based and report-based setup in `src/app/app.routes.ts`, preserving the existing return path through the authentication flow
- [X] T006 [P] Add the “Tailor CV” action to the normalized job detail and navigate with that job's ID in `src/app/pages/normalized-job-detail/normalized-job-detail.ts` and `src/app/pages/normalized-job-detail/normalized-job-detail.html`
- [X] T007 [P] Add the “Tailor CVs” action to matching report detail and navigate with that report's ID in `src/app/pages/matching-reports/matching-report-detail.ts` and `src/app/pages/matching-reports/matching-report-detail.html`

**Checkpoint**: Both launch paths reach one setup workflow. Job-detail setup permits an owned profile choice; report setup uses the report's exact profile and only its valid result jobs.

## Phase 4: User Story 2 - Track and recover CV generation (Priority: P1)

**Goal**: Show processing progress, preserve the last confirmed state, and resume accepted requests without accidental resubmission.

**Independent Test**: Exercise pending, running, completed, failed, unknown, and temporarily unavailable status responses. Navigate away and return to an accepted request; verify it resumes from the existing request and does not issue another POST. Verify retry requires an explicit candidate action after a confirmed failure.

### Implementation

- [X] T008 Extend `src/app/core/state/tailored-cv-store.ts` to track accepted processing/request IDs, poll pending and running jobs without overlapping requests, load request detail on completion, preserve state on unknown or transient errors, expose explicit retry after confirmed failure, and recover active requests without resubmitting
- [X] T009 Create a reusable processing-status component with pending, running, completed, failed, unknown, and recoverable-error presentations in `src/app/pages/tailored-cvs/tailored-cv-status/tailored-cv-status.ts`, `src/app/pages/tailored-cvs/tailored-cv-status/tailored-cv-status.html`, and `src/app/pages/tailored-cvs/tailored-cv-status/tailored-cv-status.scss`
- [X] T010 Create the request-detail page to show request status, safe error messages, selected job/profile context, and explicit retry controls in `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.ts`, `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.html`, and `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.scss`
- [X] T011 Create a request-history recovery page that loads existing requests and links active requests to their detail/status view in `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.ts`, `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.html`, and `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.scss`
- [X] T012 Register authenticated history and request-detail routes and link accepted submissions to their request detail in `src/app/app.routes.ts` and `src/app/pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup.ts`

**Checkpoint**: Accepted work remains visibly trackable after navigation or reload. A failed or uncertain status never triggers an automatic new request.

## Phase 5: User Story 3 - Review and retrieve generated CVs (Priority: P2)

**Goal**: Present completed documents with their profile/job associations, allow safe preview and authenticated download, and make prior results accessible.

**Independent Test**: Open a completed request containing per-job and general documents. Verify each document identifies its target job or group and selected profile, preview content is displayed as escaped read-only Markdown, download uses the authenticated endpoint, and history provides useful empty and retrieval-error states.

### Implementation

- [X] T013 Extend `src/app/core/state/tailored-cv-store.ts` to expose completed and partial document metadata, preserve each request's profile/job association, retrieve Markdown through `TipApi`, and report preview/download failures without success-shaped fallbacks
- [X] T014 Extend `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.ts`, `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.html`, and `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.scss` to show prior requests and available CVs with mode, profile version, job association, status, and a clear no-history state
- [X] T015 [P] Create a safe read-only Markdown preview component that renders generated document text without injecting it as HTML in `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.ts`, `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.html`, and `src/app/pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview.scss`
- [X] T016 Integrate document preview and authenticated download actions into `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.ts`, `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.html`, and `src/app/pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail.scss`; identify per-job versus general document targets and handle unavailable formats or downloads
- [X] T017 Add an authenticated document-preview route and connect history/document links to the correct request and document IDs in `src/app/app.routes.ts` and `src/app/pages/tailored-cvs/tailored-cv-history/tailored-cv-history.html`

**Checkpoint**: Candidates can find prior results, understand each document's target, preview supported Markdown safely, and download available documents through the existing authenticated API.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the full feature and ensure existing workflows remain unaffected.

- [ ] T018 Validate the end-to-end scenarios in `specs/007-job-cv-tailoring/quickstart.md`, run `npm test -- --watch=false` and `npm run build`, and resolve tailoring-related regressions in the touched `src/app/` files

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work required; the Angular project and dependencies already exist.
- **Foundational (Phase 2)**: T001 precedes T002 because the API methods consume the shared request/response types; both block the user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Establishes the shared setup and submission workflow.
- **User Story 2 (Phase 4)**: Depends on the Phase 2 API surface and the accepted request flow from US1.
- **User Story 3 (Phase 5)**: Depends on the request-detail/recovery flow from US2 and the document API methods from Phase 2.
- **Polish (Phase 6)**: Depends on all selected stories being implemented.

### User Story Dependencies

- **US1 (P1)**: Starts after the foundational models/API tasks. It is the MVP and has no dependency on another user story.
- **US2 (P1)**: Follows US1 because status tracking and recovery attach to requests created by the setup flow.
- **US3 (P2)**: Follows US2 because preview/download and history navigation build on request detail and recovery.

### Parallel Opportunities

- T006 and T007 modify separate entry-point pages and can proceed in parallel after the setup route contract is established.
- In US3, T014 and T015 work on separate files and can proceed in parallel after T013 exposes document data and preview content.
- The remaining store, route, and request-detail integration tasks are sequential where they share files or depend on newly introduced state.

## Parallel Example: User Story 1

```text
After T003-T005 establish setup state and routes:
Task: T006 Add the normalized-job detail entry action
Task: T007 Add the matching-report detail entry action
```

## Parallel Example: User Story 3

```text
After T013 exposes document metadata and Markdown:
Task: T014 Extend the CV history page with prior documents and associations
Task: T015 Create the safe Markdown preview component
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001-T002 for the shared API surface.
2. Complete T003-T007 to configure and submit a truthful, job-specific request from either supported entry point.
3. Validate US1 against its independent test criteria before adding request recovery or document management.

### Incremental Delivery

1. Add US2 status tracking and recovery without changing how requests are configured or submitted.
2. Add US3 history, document associations, preview, and download.
3. Run the quickstart scenarios, client tests, and production build after all three stories are integrated.

### Deferred Backend Work

No backend implementation is planned. The frontend depends on the existing profile listing, tailoring, processing status, request history/detail, and authenticated Markdown download contracts described in `specs/007-job-cv-tailoring/contracts/cv-tailoring.md`.
