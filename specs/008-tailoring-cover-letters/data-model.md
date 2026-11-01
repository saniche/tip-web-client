# Data Model: Optional Cover Letters in Tailoring Sessions

The feature extends the existing tailoring configuration and document views. It adds no new persisted entity, job lifecycle, or storage system. Backend request and document records remain the source of truth.

## Existing Entities

### Tailoring Session Configuration

Draft client-side choices collected before submission.

| Field | Type/meaning | Rules |
|---|---|---|
| `job_ids` | Selected normalized job IDs | 1–10 distinct jobs from the current launch source |
| `profile_id` | Selected candidate-owned profile version | Required; fixed to the report profile for report-launched sessions |
| `cv_mode` | CV output scope | `per_job` or `general`; independent of letter mode |
| `cover_letter.enabled` | Whether to generate letters | Defaults to `false` |
| `cover_letter.mode` | Letter output scope | Required when enabled; `per_job` or `general`; independent of CV mode |
| `output_language` | Language for generated outputs | Shared by CVs and letters; initialized from selected profile and editable in the session |

Configuration stays in the existing tailoring store and follows the current draft/session lifecycle. It is not persisted as a separate letter preference.

### Tailoring Request

Existing service-owned request created for one tailoring session.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Request identifier | Existing history/detail identifier |
| `job_ids` | Selected jobs | Shared by all output types |
| `profile_id` | Pinned profile version | Shared by all output types |
| `cv_mode` | CV scope | `per_job` or `general` |
| `cover_letter.enabled` | Letter opt-in | Missing/false means no letters |
| `cover_letter.mode` | Letter scope | `per_job` or `general` when enabled |
| `output_language` | Selected language | Shared by all output types |
| `status` | Request outcome | Processing/completed/partial/failed per existing service states |
| `error` | Request-level failure information | Does not replace per-document errors |
| `created_at` | Request creation time | Existing history ordering |

The backend validates the mode values and requires a letter mode when letters are enabled. It defaults an omitted letter object to disabled.

### Generated Document

One CV or cover letter associated with the existing request.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Document identifier | Used by the existing preview/download flow |
| `kind` | Document type | `cv` or `cover_letter` |
| `scope` | Output scope | `per_job` or `general`, independent per kind |
| `job_id` | Single target job | Set for per-job output; null for group output |
| `job_ids` | Associated target jobs | One job for per-job output; all selected jobs for general output |
| `status` | Document outcome | Display processing/success/failure per document |
| `error`, `warning` | Output details | Display when present; one document's error does not imply other documents failed |
| `filename` | Download filename | Available for completed documents |
| `download_url` | Temporary download reference | Existing authenticated document download remains authoritative |
| `created_at` | Document creation time | Existing result/history metadata |

The selected profile and output language are inherited from the parent request. A document does not create its own profile or language selection.

## Relationships and Output Counts

- One tailoring session creates one request.
- One request references 1–10 selected jobs and one selected profile.
- Each request may contain CV documents and, when enabled, cover-letter documents.
- A `per_job` output kind has one document per selected job; a `general` output kind has one document associated with all selected jobs.
- For *n* selected jobs, the four enabled combinations produce:

| CV mode | Letter mode | CV count | Letter count |
|---|---|---:|---:|
| `per_job` | `per_job` | *n* | *n* |
| `per_job` | `general` | *n* | 1 |
| `general` | `per_job` | 1 | *n* |
| `general` | `general` | 1 | 1 |

When letters are disabled or omitted, letter count is zero and CV behavior is unchanged.

## Validation and State

- Validate 1–10 distinct selected jobs and a usable selected profile before submission, using existing setup rules.
- Accept only `per_job` or `general` for each output mode; validate independently.
- Require a letter mode only when `cover_letter.enabled` is true.
- Use the same selected jobs, profile, and output language for CV and letter generation.
- Preserve request-level processing states and terminal outcomes. Each document's status/error remains authoritative for that output.
- Only completed documents are previewable/downloadable.
- Whole-request retry remains limited to the existing failed-request workflow. It must preserve the letter setting and mode. Partial requests do not receive per-output retry unless that capability is added to the service.
- The existing request/document deletion scope, if exposed in the client, includes associated letters; no separate letter delete lifecycle is introduced.
