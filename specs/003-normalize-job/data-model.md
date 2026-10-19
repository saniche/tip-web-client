# Data Model: Normalize Job Submission

**Date**: 2026-10-17 | **Feature**: `003-normalize-job`

## Server Contract Shapes

### `NormalizeJobRequest` (client → server)

| Field     | Type   | Required | Notes                                                        |
|-----------|--------|----------|--------------------------------------------------------------|
| `url`     | string | yes      | Source URL of the job posting; must be non-empty (FR-013).   |
| `content` | string | yes      | `JSON.stringify(rawContent)` — a JSON-encoded string, not an object. |

### `NormalizationJob` (server → client, submit response)

| Field               | Type            | Notes                                   |
|---------------------|-----------------|-----------------------------------------|
| `id`                | string          | Job id; link target for the detail page.|
| `status`            | string          | Initial job status.                     |
| `processing_job_id` | string \| null  | Poll this id when present; when null, the job status is already terminal. |
| `title`             | string \| null  | Usually null until processing finishes. |
| `url`               | string \| null  | Echoed source URL.                      |
| `created_at`        | string \| null  | ISO date.                               |

### `ProcessingJob` (server → client, poll response)

| Field       | Type           | Notes                                             |
|-------------|----------------|---------------------------------------------------|
| `id`        | string         | Processing job id.                                |
| `status`    | `'pending' \| 'processing' \| 'completed' \| 'failed'` | Terminal states: `completed`, `failed`. |
| `result_id` | string \| null | Present on `completed`; normalized job id.        |
| `error`     | string \| null | Present on `failed`; user-displayable message.    |

## Client-Side View Model

### `NormalizationSubmission` (store entity)

Merges submit and poll data into one per-submission record tracked by `NormalizationStore`.

| Field             | Type                 | Source / Notes                                          |
|-------------------|----------------------|----------------------------------------------------------|
| `id`              | string               | Client-generated correlation id (keyed record).          |
| `jobId`           | string \| null       | `NormalizationJob.id` once submitted.                    |
| `processingJobId` | string \| null       | `processing_job_id` from the submit response.            |
| `url`             | string               | User input.                                              |
| `status`          | `SubmissionStatus`   | Derived: `'submitting' \| 'pending' \| 'processing' \| 'completed' \| 'failed'`. |
| `resultId`        | string \| null       | From poll `result_id` (fallback: submit response `id`).  |
| `error`           | string \| null       | From poll `error` or submit failure message.             |
| `submittedAt`     | string               | ISO date; used for ordering and persistence.             |
| `statusCheckFailed` | boolean (optional) | Transient: true while a poll transport error is being retried. |

`SubmissionStatus` transitions:

```text
submitting ──► pending ──► processing ──► completed
    │              │             │
    └──────────────┴─────────────┴──────► failed
```

- `submitting`: POST in flight (spinner on, no poll yet).
- `pending`/`processing`: polling active (spinner on).
- `completed`/`failed`: terminal; spinner off; success link or error message shown.

### Persisted record (`localStorage`, key `tip.normalization.submissions`)

The full `NormalizationSubmission` (including terminal outcomes) is persisted so the dashboard lists all previously submitted normalization jobs after a reload (FR-011). Written on every state change from `pending` onward; removed only on `dismiss()`. Restored on `NormalizationStore` initialization: records with a non-terminal status and a `processingJobId` resume polling; terminal records are restored into history as-is. Legacy records without a `status` field are treated as in-flight.

`statusCheckFailed` (optional boolean) is a transient UI flag set when a poll hits a transport error and cleared on the next successful poll; it is not required for restore.

## Validation Rules

- `url`: required, non-empty after trim (FR-013).
- `content`: required, non-empty after trim; serialized via `JSON.stringify` before sending (FR-002).
- Polling only starts when `processing_job_id` is non-null; otherwise the submit response `status` is treated as already terminal (edge case).

## Relationships

- One `NormalizationSubmission` → zero-or-one `NormalizationJob` → zero-or-one `ProcessingJob`.
- Dashboard in-progress count = `NormalizationStore` submissions with status `pending` or `processing` (computed signal).
- `resultId` links to the existing `NormalizedJobDetail` route (`/normalized-jobs/:id`) from feature 002.
