# API Contract: Normalize Job Submission

**Feature**: `003-normalize-job` | **Date**: 2026-10-17

This feature **consumes** two server endpoints and exposes no server-side interface of its own. The client-facing contract is the `TipApi` surface plus the `NormalizationStore` signal API described below.

## Consumed Endpoints

### `POST {baseUrl}/jobs/normalize`

Submits a job posting for asynchronous normalization.

**Request body**:

```json
{
  "url": "string",
  "content": "string  // JSON.stringify(rawContent) to avoid parsing errors"
}
```

**Response** (`200/201/202`):

```json
{
  "id": "string",
  "status": "string",
  "processing_job_id": "string|null",
  "title": "string|null",
  "url": "string|null",
  "created_at": "date|null"
}
```

**Client behavior**:
- Serialize `content` with `JSON.stringify` before sending (FR-002).
- Reject locally when `url` or `content` is empty (FR-013).
- If `processing_job_id` is present → begin polling (see below).
- If `processing_job_id` is `null` → treat the returned `status` as terminal; show success (with `id` as the result link) or failure without polling.

### `GET {baseUrl}/processing-jobs/{processing_job_id}`

Polls the status of one normalization task. Called every ~2 seconds per in-flight submission until a terminal status.

**Response**:

```json
{
  "id": "string",
  "status": "pending | processing | completed | failed",
  "result_id": "string|null",
  "error": "string|null"
}
```

**Client behavior**:
- `pending` / `processing` → keep spinner, continue polling.
- `completed` → stop polling, hide spinner, show success with a link to `/normalized-jobs/{result_id}` (fallback: submit response `id`).
- `failed` → stop polling, hide spinner, show `error` (or a generic fallback message).
- Transport errors during polling → surface a recoverable "status check failed" state and keep/retry polling; never lose the submission.

## Client API Surface (internal)

### `TipApi` additions (`src/app/core/api/tip-api.ts`)

```text
normalizeJob(request: NormalizeJobRequest): Observable<NormalizationJob>
getProcessingJob(processingJobId: string): Observable<ProcessingJob>
```

### `NormalizationStore` (`src/app/core/state/normalization-store.ts`, root-provided)

```text
State signals:
  submissions: Signal<NormalizationSubmission[]>        // newest first
  inProgressCount: Signal<number>                       // computed: pending|processing
  hasInProgress: Signal<boolean>                        // computed

Methods:
  submit(url: string, rawContent: unknown): void        // validates, POSTs, starts polling
  dismiss(submissionId: string): void                   // remove a terminal submission from the list
  // store init restores persisted in-flight submissions and resumes polling
```

### Routes

| Route            | Component                | Accessed from                          |
|------------------|--------------------------|----------------------------------------|
| `/normalize-job` | `NormalizeJob` (lazy)    | Dashboard link; normalized-jobs listing link |

Dashboard additions: "Normalize job" link + in-progress normalization count badge/list (FR-011, FR-012).
Normalized-jobs listing addition: "Normalize job" link (FR-010).
