# Data Model: Matching Sessions and Reports

This is a frontend workflow model only. It does not introduce server-owned records or change the meaning of normalized jobs, interests, profiles, or reports. Fields derived from backend responses must match the verified contract documented in [matching-api.md](./contracts/matching-api.md).

## Matching Session

Represents the one active matching workflow for the current browser tab.

| Field                 | Type                                                          | Rules                                                                                                |
| --------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `state`               | `open \| submitting \| processing \| closed`                  | `open` is editable; `submitting` and `processing` are locked; `closed` is a terminal summary state.  |
| `selectedJobs`        | `SelectedJob[]`                                               | Unique by `jobId`; may combine jobs from both supported entry points.                                |
| `submittedJobIds`     | `string[]`                                                    | Set only for jobs actually accepted into the matching request; persisted while processing.           |
| `processingId`        | `string \| null`                                              | The identifier returned for the matching operation; never substituted with a job or report ID.       |
| `reportId`            | `string \| null`                                              | Set only when supplied by a verified response; may become available during processing.               |
| `lastConfirmedStatus` | `string \| null`                                              | Preserve the backend value; unknown values remain unknown and are never converted to a known status. |
| `processingError`     | `string \| null`                                              | Displayed when confirmed by a backend response or surfaced as a recoverable request error.           |
| `reportLoadState`     | `not-requested \| loading \| loaded \| failed \| unavailable` | Report loading is separate from process success/failure.                                             |
| `notSubmittedJobs`    | `NotSubmittedJob[]`                                           | Retains per-job prerequisite failures and a user-readable reason.                                    |
| `summary`             | `SessionSummary \| null`                                      | In-memory terminal summary; persisted active state is cleared on close as required.                  |

### Lifecycle

```text
Open -> Submitting -> Processing -> Closed
  ^         |                         |
  |         +-- prerequisite failure  +-- dismiss -> no active session
  +-- rejected submission

Processing -- confirmed done/failed --> Closed
Processing -- polling error/unknown --> Processing (last confirmed state retained)
```

An immediately terminal, verified submission response follows the corresponding terminal transition without another poll. A failed report retrieval does not change a confirmed `done` process into a failure.

## Selected Job

Represents one job selected for a session.

| Field           | Type                                        | Rules                                                                                     |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `jobId`         | `string`                                    | Required, non-empty, and unique in a session.                                             |
| `title`         | `string \| null`                            | Snapshot of available normalized-job data; never fabricated.                              |
| `company`       | `string \| null`                            | Snapshot of available normalized-job data; never fabricated.                              |
| `location`      | `string \| null`                            | Optional display snapshot.                                                                |
| `jobSource`     | `string \| null`                            | Existing job source metadata where available.                                             |
| `entrySource`   | `normalized-jobs \| my-interests`           | Describes how it was selected; duplicate selection retains one job and its known origins. |
| `interestState` | `known-in-interest \| needs-add \| unknown` | Derived only from reliable existing information; unknown does not imply already present.  |

Selected jobs are editable only while the session is `open`. Selection itself has no backend side effect.

## Not-Submitted Job

| Field    | Type     | Rules                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------- |
| `jobId`  | `string` | Must refer to a selected job.                                                   |
| `reason` | `string` | Required actionable error from a failed prerequisite; do not mark as submitted. |

Each job may trigger at most one interest-add attempt in a single confirmation flow. Retry is a new session and requires user review.

## Matching Submission

Represents one confirmed operation, not a per-job process.

| Field             | Type                                                                    | Rules                                                                             |
| ----------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `processingId`    | `string`                                                                | Required after a verified accepted response.                                      |
| `status`          | known `pending \| running \| done \| failed` or unrecognized raw string | Only known terminal values close the session; unknown values remain unrecognized. |
| `reportId`        | `string \| null`                                                        | Use only an actual backend identifier.                                            |
| `submittedJobIds` | `string[]`                                                              | All and only jobs included in the one request.                                    |
| `error`           | `string \| null`                                                        | Only from verified response/request error information.                            |

The exact response field names and nullability are subject to contract verification. No automatic splitting into multiple submissions is allowed.

## Matching Report and Result

### Matching Report

| Field       | Type               | Rules                                                      |
| ----------- | ------------------ | ---------------------------------------------------------- |
| `id`        | `string`           | Actual report identifier.                                  |
| `status`    | `string`           | Values and terminal semantics must be verified.            |
| `createdAt` | `string \| null`   | Display only when present and valid.                       |
| `profileId` | `string \| null`   | Source of report profile-version metadata when supplied.   |
| `results`   | `MatchingResult[]` | May be empty; exact envelope and details must be verified. |

### Matching Result

| Field           | Type                                 | Rules                                                                                                                        |
| --------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string \| null`                     | Actual result identifier when available.                                                                                     |
| `jobId`         | `string \| null`                     | Associate with job data when available; otherwise show the identifier or an unavailable marker.                              |
| `score`         | `number \| null`                     | Never recompute; null is shown as "Not scored".                                                                              |
| `eligible`      | `boolean \| null`                    | Present separately from narrative analysis.                                                                                  |
| `scoringStatus` | `string \| null`                     | Exact values and retry classification require backend verification.                                                          |
| `rank`          | `number \| null`                     | Preserve backend order semantics; no cross-report ranking.                                                                   |
| `breakdown`     | verified value or omitted            | Render only after confirming its current schema.                                                                             |
| `explanation`   | current, legacy, or unexpected value | Render full current-format sections only after structural/explicit-version validation; otherwise use a safe simplified view. |

Current-format rendering requires complete structural validation of requirements/desirables, criterion, exact `Yes`/`No` judgment, evidence, notes (when present), and all described analysis fields. Incomplete, legacy, or unexpected values use a safe simplified display. Analysis subsections are display-only qualitative content. No score, judgment, probability, evidence, or analysis is generated by the client.

Report terminal status values are not specified in the available brief. The report UI therefore preserves and displays the raw status but keeps deletion unavailable until terminal semantics can be verified. It does not infer report terminality from matching-process statuses.

## Persistence and Validation

- Persist only the minimal active session state needed for selection and process recovery in `sessionStorage`.
- While processing, persist `processingId`, any known `reportId`, `submittedJobIds`, and the last confirmed process state.
- Do not persist report payloads, credentials, or duplicate backend history.
- Clear the matching-session entry on explicit discard and when the session closes. Keep any terminal summary in active in-memory UI state until dismissed.
- On restore, validate the stored shape and required identifiers before resuming. Invalid or incomplete state must be surfaced as unrecoverable/recoverable state, never silently treated as a successful or failed submission.
- Report status, scoring-status classification, and result schema validation must follow verified backend contracts.
