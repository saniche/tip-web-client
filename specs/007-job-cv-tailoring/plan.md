# Implementation Plan: Job-Specific CV Tailoring

**Branch**: `007-job-cv-tailoring` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Tailor CVs from a normalized job or matching report, letting the authenticated candidate choose 1–10 jobs, profile version, mode, and output language.

## Summary

Integrate the client with the existing profile-version, matching-report, and `/api/v1/tailoring` APIs. Provide a session workspace separate from CV history. Job-based sessions can accumulate jobs from normalized-job pages; report-based sessions contain only jobs from that report and use its profile. Ask before replacing an incompatible draft. Provide `per_job` (default) and `general` modes and initialize an editable output language from the selected profile. Submit only after confirmation, with cover letters disabled. Reuse existing async status, request history, document metadata, and Markdown download; no backend changes are required.

## Technical Context

**Language/Version**: TypeScript with Angular 22.1.

**Primary Dependencies**: Angular standalone components and Router, Angular Signals, RxJS 7.8, existing `TipApi` and authenticated API interceptor.

**Storage**: Backend-managed candidate profile versions, tailoring requests, and document records; existing Markdown blob storage. The unfinished session is held in memory across in-app navigation, not browser reloads. Accepted processing IDs are stored in user-scoped browser storage for recovery.

**Testing**: Angular CLI unit tests with Vitest (`npm test -- --watch=false`) and production build (`npm run build`); API contract/integration tests against the existing backend service.

**Target Platform**: Authenticated browser client and the existing authenticated API.

**Project Type**: Angular web client integrating existing backend APIs.

**Performance Goals**: Use asynchronous acceptance and the existing processing-job polling behavior. Poll at the existing two-second interval without overlapping status requests. No separate generation-time SLA is established.

**Constraints**: Use the existing `TailoringRequestIn` contract; submit 1–10 distinct jobs; default to `per_job`; always disable cover letters; keep profile selection and output-language edits local to the request; do not introduce backend changes or new processing/document infrastructure.

**Scale/Scope**: One request includes one to ten normalized jobs. `per_job` creates one CV per job; `general` creates one CV for the whole selected job set. Cover-letter generation remains out of scope.

## Constitution Check

The repository's `.specify/memory/constitution.md` contains only unfilled template placeholders; it defines no ratified principles or enforceable gates. This design follows existing client architecture and reuses the already implemented APIs.

**Pre-research gate**: PASS — no constitutional violations or unresolved project principles.

## Project Structure

### Documentation (this feature)

```text
specs/007-job-cv-tailoring/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── cv-tailoring.md
```

### Source Code

```text
src/app/
├── app.routes.ts                                  # Guarded tailoring setup/history/detail routes
├── core/
│   ├── api/tip-api.ts                             # Profile list and tailoring request methods
│   ├── models/tailored-cv.ts                      # Setup, request, processing, and document types
│   └── state/tailored-cv-store.ts                 # Signals, active request recovery, and polling
└── pages/
    ├── normalized-job-detail/                     # Job-detail entry action
    ├── matching-reports/matching-report-detail.ts # Matching-report entry action
    └── tailored-cvs/
        ├── tailored-cv-setup/                     # Job/profile/mode/language configuration
        ├── tailored-cv-history/                   # Active requests and previous requests
        ├── tailored-cv-request-detail/            # Request status and document list
        └── tailored-cv-preview/                   # Safe read-only Markdown preview

src/app/core/api/tip-api.spec.ts
src/app/core/state/tailored-cv-store.spec.ts
src/app/pages/normalized-job-detail/normalized-job-detail.spec.ts
src/app/pages/matching-reports/matching-report-detail.spec.ts
src/app/pages/tailored-cvs/
└── *.spec.ts
```

**Structure Decision**: Keep both entry points in their existing pages and route into one guarded configuration workflow. Add one root-provided Signals store and lazy-loaded setup/history/request-detail pages. Modify only the client API/models/routes/UI and directly related tests.

## Current Architecture Findings

- The client uses Angular standalone components, lazy routes, `TipApi`, Angular Signals, and RxJS. Existing sources include `src/app/app.routes.ts`, `src/app/core/api/tip-api.ts`, `src/app/core/state/profile-store.ts`, and `src/app/core/state/matching-store.ts`.
- `NormalizedJobDetail` already loads the selected job; its action can pass the job ID into setup.
- Matching report detail is already retrieved by `TipApi.getMatchingReport()` and provides result job IDs. `TipApi.listMatchingReports()` provides the report's profile ID.
- The frontend currently has `getProfile()` for the default/current profile but no profile-version list method. The backend already exposes authenticated `GET /api/v1/profiles`, returning IDs, labels, output languages, default markers, and timestamps.
- The current backend exposes `POST /api/v1/tailoring`, request list/detail, processing-job status, and authenticated tailored-document download. The request contract supports 1–10 job IDs, `profile_id`, `cv_mode` (`per_job` or `general`), `cover_letter`, and `output_language`.
- The request pins the selected profile, validates jobs are completed, and returns a processing-job ID plus a tailoring-request ID. Request details include the selected profile, jobs, request status, and document metadata.
- Backend source inspected: [`tailoring/tailoring_router.py`](https://github.com/saniche/tip-backen-api/blob/main/tailoring/tailoring_router.py), [`profile/profiles_router.py`](https://github.com/saniche/tip-backen-api/blob/main/profile/profiles_router.py), and [`shared/schemas.py`](https://github.com/saniche/tip-backen-api/blob/main/shared/schemas.py).

## Frontend Implementation Plan

1. Add a profile-version summary model and `TipApi.listProfiles()` for the existing `/profiles` endpoint. Reuse `getMatchingReport()` and `getNormalizedJob()` for entry-context details.
2. Add request, mode, status, document, and profile-version types matching existing API shapes. Preserve unknown processing status values instead of coercing them to pending.
3. Add a separate `/tailoring-session` workspace accepting `jobId` or `reportId` query parameters. Retain the existing job/report setup routes. Job-based sessions can accumulate distinct jobs from multiple details; report sessions offer only valid jobs from their report. Both enforce the 1–10 selection limit and ask before replacing an incompatible draft.
4. In setup, default `cv_mode` to `per_job`; offer `general`; describe the resulting document count. From job details, allow selection among owned profile versions and default to the candidate's default. From a matching report, require and lock the profile version associated with that report; do not substitute another profile.
5. Initialize editable output language from the selected profile's `output_language`. When the candidate changes profile, reset the language field to the newly selected profile's default. Do not write either request choice back to the profile.
6. Submit exactly the selected `job_ids`, `profile_id`, `cv_mode`, `output_language`, and `cover_letter: { enabled: false }`. Disable submission for empty/oversized job sets, missing profile, blank language, or an active submission.
7. Add a root-provided `TailoredCvStore` using Angular `signal`/`computed` state and RxJS polling. It owns setup state, request history/detail, active request recovery, status/error state, preview, and download.
8. Add a “Tailor CVs” entry from matching report detail and a “Tailor CV” action from normalized job detail. Require authentication, preserve the return path, and do not alter matching/profile workflows.
9. Add guarded lazy routes for setup, history, and request detail. Reusable status and safe read-only Markdown preview components serve active requests and document detail.
10. Recover in-progress requests from the backend request list and stored processing identifiers. On completion, load request detail; use document `job_id`/`job_ids` and request `profile_id` to label each result.

## Backend Implementation Tasks

No backend implementation changes are required. The current backend already supports profile-version listing, direct job-ID tailoring, both CV modes, optional profile selection, output language, request history/detail, asynchronous status, and Markdown document download. Confirm the deployed API exposes the inspected contract before client integration.

## API Contract

No API changes are proposed:

- `GET /api/v1/profiles` lists candidate-owned profile versions.
- `GET /api/v1/matching/reports/{report_id}` provides report job IDs; `GET /api/v1/matching/reports` provides its profile ID.
- `POST /api/v1/tailoring` accepts one to ten selected job IDs, selected profile ID, `cv_mode`, disabled cover-letter settings, and output language.
- `GET /api/v1/processing-jobs/{id}` tracks pending/running/done/failed; `result_id` identifies the tailoring request.
- `GET /api/v1/tailoring/requests` and `GET /api/v1/tailoring/requests/{request_id}` provide history, request status, and document metadata.
- `GET /api/v1/tailoring/documents/{document_id}/download` returns the authenticated Markdown document.

See [contracts/cv-tailoring.md](./contracts/cv-tailoring.md) for request and response shapes.

## Data Flow

1. The candidate starts setup from a normalized job or matching report. Setup obtains the selected job IDs from the existing route context/report detail and offers only valid source jobs.
2. The client loads the authenticated candidate's profile-version summaries. From job details, the candidate selects a version, defaulting to their profile default. From a matching report, the report's associated profile version is required and fixed. If it is unavailable, block that flow and explain recovery.
3. The candidate selects `per_job` or `general` and confirms the job set. The client submits the exact selected IDs and options with cover letters disabled.
4. The backend validates ownership, profile, and job status; pins the profile; creates a tailoring request and processing job; and returns their identifiers.
5. The client polls status and recovers active request IDs without resubmitting. A processing result ID is the request ID.
6. On completion, the client loads request detail and the produced CV document IDs. The CV is associated with the selected profile and either one job or the whole selected group.
7. History displays the request's jobs, profile version, mode, output language, status, and documents. The client previews/downloads the selected document through the authenticated route.

## Test Strategy

- **API client tests**: Verify profile-list and tailoring request serialization, exact selected job IDs, `per_job`/`general`, output-language propagation, explicit cover-letter disablement, response mapping, history/detail, and Markdown retrieval.
- **Store tests**: Cover profile-list loading/defaults, report-profile pinning and unavailable-profile handling, profile/language changes on job-detail entry, 1–10 distinct job validation, mode document-count semantics, duplicate submission prevention, pending/running/done/failed/unknown states, request recovery, partial/failure documents, and preview/download errors.
- **Setup-page tests**: Verify normalized-job entries accumulate distinct jobs and retain options across navigation; matching-report entry contains only report jobs; incompatible drafts require replacement confirmation; candidate can select at most ten; report profile is fixed and cannot be changed; an unavailable report profile blocks submission; and final values sent match the UI.
- **Report/detail UI tests**: Verify the tailoring entry action navigates with the correct report ID and does not change matching-report behavior.
- **End-to-end API test**: Use a candidate with multiple profiles and a report. Generate using both modes, test a custom output language and a non-default profile, then verify request/document metadata, preview, download, and owner scoping.
- **Regression gates**: Run focused client tests and production build; verify existing profile, matching-session, normalized-job detail, and application flows are unchanged.

## Dependencies and Risks

- The frontend must target a backend deployment exposing the current `GET /profiles` and `/tailoring` APIs.
- The tailoring API limits requests to ten job IDs; report setup must enforce the limit before submission.
- Matching report results may have missing job IDs or a profile ID that is no longer available. Exclude invalid jobs; if the report profile is unavailable, block report-based tailoring rather than substituting another profile.
- A `general` request produces one document for the entire selected group; a `per_job` request produces one document per selected job. Show this difference before confirmation.
- `result_id` from processing is a tailoring request ID, not a document ID. Fetch request details before presenting documents.
- Candidate-edited output language must not mutate profile data. Always submit cover-letter generation as disabled.
- A single request can create multiple documents; handle individual document errors and request-level partial status even though only CVs are requested.
- Markdown is the current document format. Preview must remain safe and readable without treating generated content as trusted HTML.

## Recommended Implementation Sequence

1. Confirm the frontend environment targets a backend deployment exposing the current profile-version and tailoring routes.
2. Add profile-version and tailoring models plus API methods with contract tests.
3. Implement `TailoredCvStore` configuration, request lifecycle, history, recovery, and status tests.
4. Add the setup page and both entry routes; implement job/profile/mode/language selection and validation.
5. Add normalized-job and matching-report entry actions, then history/request-detail/preview/download UI.
6. Run client regression tests/build and end-to-end checks for both `per_job` and `general`, profile selection, language changes, and matching-report initiation.

## Post-Design Constitution Check

**PASS** — no ratified constitution gates exist. The design reuses current profile, matching report, tailoring, status, and storage APIs; it introduces no backend changes, framework, or document infrastructure.
