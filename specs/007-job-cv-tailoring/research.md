# Research: Job-Specific CV Tailoring

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-10-30

## Current Architecture Evidence

- The client uses Angular standalone components, lazy routes, `TipApi`, Angular Signals, and RxJS. Relevant sources include `src/app/app.routes.ts`, `src/app/core/api/tip-api.ts`, `src/app/core/state/profile-store.ts`, and `src/app/core/state/matching-store.ts`.
- `NormalizedJobDetail` already retrieves selected job details. `TipApi.getMatchingReport()` returns report results; `TipApi.listMatchingReports()` supplies the matching report's profile ID. The client can reuse these APIs for the two setup entry points.
- The client currently retrieves only the default profile through `getProfile()` and does not expose a profile-version list.
- The backend exposes authenticated `GET /api/v1/profiles`, returning profile IDs, labels, output languages, default markers, and timestamps. Its tailoring request can pin a profile ID.
- The current backend [`tailoring/tailoring_router.py`](https://github.com/saniche/tip-backen-api/blob/main/tailoring/tailoring_router.py) accepts 1–10 job IDs, a profile ID, CV mode, cover-letter options, and output language. It creates a processing job and a request record; request detail returns documents.
- The backend processing resource returns a processing-job ID and request result ID. Request history/detail and authenticated Markdown download are already available.

## Decisions

### 1. Support both entry points through one configuration flow

**Decision**: The normalized-job detail action adds its job to a job-based session workspace, allowing additional jobs from other detail pages. The matching-report action opens the same workspace with valid jobs from that report available for selection. Incompatible unfinished sessions require confirmation before replacement, and history is a separate page.

**Rationale**: Both routes lead to the same API input and should share validation, profile selection, mode, language, and submission behavior. A report's job IDs come from report detail and its profile ID from the matching report list.

**Alternatives considered**:

- Duplicate a separate tailoring form in each source page: rejected because the configuration and submission semantics should remain consistent.
- Add jobs outside the selected report during report-based setup: rejected because it weakens the meaning of launching from that report.

### 2. Keep the report job selection within the API limit

**Decision**: Allow the candidate to choose one to ten distinct valid job IDs from the report. Exclude missing job IDs and block empty or over-limit submissions.

**Rationale**: The existing request schema limits `job_ids` to ten and drops duplicates. Client-side selection gives clear feedback before submission.

**Alternatives considered**:

- Silently truncate reports with more than ten jobs: rejected because it hides which jobs will be tailored.
- Submit an empty list and rely on API validation: rejected because the client can explain and prevent the error earlier.

### 3. Expose both modes with `per_job` as the default

**Decision**: Always send the selected mode. Default to `per_job`; its output count equals the selected job count. `general` generates one document for the entire selected job group.

**Rationale**: These are the backend's supported CV modes; describing document counts before confirmation makes their effect clear.

**Alternatives considered**:

- Restrict the UI to one mode: rejected because both modes are explicitly supported and requested.

### 4. Select an owned profile version and initialize language from it

**Decision**: Add a client method for existing `GET /api/v1/profiles`. From normalized-job setup, allow selecting any owned profile version and default to the candidate's default. From matching-report setup, require and lock the profile version associated with that report; do not substitute another profile. Initialize editable output language from the applicable profile and submit it without modifying the saved profile.

**Rationale**: The backend profile list includes the needed version metadata, and the tailoring request already accepts `profile_id` and `output_language`. The profile ID pins the generation context.

**Alternatives considered**:

- Allow changing the profile when starting from a matching report: rejected because that tailoring must use the profile version that produced the report.
- Substitute the candidate's default profile when the report profile is unavailable: rejected because it would silently change the report's profile context.
- Default the output language to English regardless of profile: rejected because the requested behavior is to match the selected profile's preference.
- Persist a changed language to the profile: rejected because profile mutation is outside the feature.

### 5. Explicitly disable cover letters

**Decision**: Send `cover_letter: { enabled: false }` on every request.

**Rationale**: The backend supports optional cover-letter generation, but this feature does not.

**Alternatives considered**:

- Rely on the backend default: rejected because explicit disablement is easier to test and protects feature scope.

### 6. Reuse asynchronous request, history, and document APIs

**Decision**: Poll the processing job, then retrieve the tailoring request by its `result_id`, and use the document IDs in the request detail for preview/download. Use request history for recovery.

**Rationale**: `result_id` identifies a request, not a document. The backend already persists requests and documents and provides owner-scoped history, details, and Markdown download.

**Alternatives considered**:

- Treat processing `result_id` as a document ID: rejected because it would address the wrong resource.
- Persist generated content in browser storage: rejected because the backend is the source of truth for documents.

### 7. Use safe Markdown preview and existing Angular Signals/RxJS patterns

**Decision**: Preview generated Markdown as escaped read-only text. Use a root-provided Signals store and RxJS for API calls and polling.

**Rationale**: This avoids a new renderer or processing framework while keeping generated content non-executable.

**Alternatives considered**:

- Inject generated Markdown as HTML or introduce a conversion service: rejected because neither is needed for preview/download.
- Introduce a new state framework: rejected because existing Angular Signals/RxJS patterns are sufficient.

## Existing API Contract Confirmed

- `GET /api/v1/profiles` lists the authenticated candidate's profile versions with `id`, `label`, `output_language`, `is_default`, and timestamps.
- `GET /api/v1/matching/reports` supplies the profile ID for each report; `GET /api/v1/matching/reports/{report_id}` supplies result job IDs.
- `POST /api/v1/tailoring` accepts `job_ids` (1–10), optional `profile_id`, `cv_mode` (`per_job` or `general`), `cover_letter`, and `output_language`.
- The request accepts a single selected profile ID and pins it. The API validates that requested jobs exist and are completed.
- The initial response is `202` with a processing-job ID and tailoring-request ID in `result_id`.
- `GET /api/v1/processing-jobs/{id}` provides pending/running/done/failed status.
- `GET /api/v1/tailoring/requests` lists requests; `GET /api/v1/tailoring/requests/{request_id}` returns request metadata and document records.
- `GET /api/v1/tailoring/documents/{document_id}/download` returns authenticated Markdown document content.

No backend changes are required for these behaviors.
