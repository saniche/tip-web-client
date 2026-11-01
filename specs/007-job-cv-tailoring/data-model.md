# Data Model: Job-Specific CV Tailoring

The feature consumes existing candidate profile versions, normalized jobs, matching reports, tailoring requests, processing jobs, and tailored documents. It introduces client-side view models only; no backend data-model changes are required.

## Existing Entities

### Candidate Profile Version

One saved profile owned by the authenticated candidate.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Profile version ID | Submitted as `profile_id` |
| `label` | Candidate-readable version name | Display in profile selector |
| `output_language` | Profile's preferred generated-document language | Initial value for editable request language |
| `is_default` | Whether this is the candidate's default profile | Used to initialize job-detail setup, never as a report-profile fallback |
| `created_at`, `updated_at` | Profile timestamps | Identify/select a version when labels are similar |

`GET /profiles` returns profile summaries. The backend resolves the selected version and enforces ownership when accepting a tailoring request.

### Normalized Job

One completed normalized job posting.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Job ID | Included in `job_ids` |
| `status` | Normalization state | Must be completed for submission |
| `title`, `summary` | Role context | Supports relevance and presentation |
| `required`, `desirable` | Job criteria | Context, not candidate qualifications |
| `technical_stack` | Job technologies | Not candidate skills unless supported by profile |
| `key_responsibilities` | Role responsibilities | Not candidate achievements |

For a job-based session, jobs can be accumulated from normalized-job details. For a report-based session, each is a valid result job selected from that report.

### Matching Report

A candidate-owned report used as a source of candidate-selectable jobs and its required profile version.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Report ID | Identifies the selected source report |
| `profile_id` | Profile version used by the report | Required profile for tailoring started from this report; no substitution |
| `results[].job_id` | Result job ID | Candidate may select valid IDs from this report only |

The report ID is setup context; the tailoring API receives its selected job IDs and profile ID, not the report ID.

## Tailoring Configuration

Client-side state assembled before submission.

| Field | Type/meaning | Rules |
|---|---|---|
| `source` | Normalized-job detail or matching report | Determines which jobs are selectable |
| `job_ids` | Distinct selected job IDs | 1–10 jobs accumulated from job details, or 1–10 jobs from the selected report |
| `profile_id` | Selected owned profile version | From job detail, candidate-selected (defaulting to candidate default); from report, fixed to that report's profile |
| `cv_mode` | `per_job` or `general` | Defaults to `per_job` |
| `output_language` | Editable language value | Defaults to selected profile's output language; does not mutate profile |
| `cover_letter.enabled` | Whether to generate a cover letter | Always `false` |

## Tailoring Request

Backend record created for the authenticated candidate.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Request ID | Returned as processing response `result_id` |
| `user_id` | Candidate owner | Enforced by backend |
| `job_ids` | Selected target job set | One to ten distinct jobs |
| `profile_id` | Pinned profile version | Matches the candidate's selection |
| `mode` | CV mode | `per_job` or `general` |
| `cover_letter_enabled` | Optional generation setting | `false` for this feature |
| `output_language` | Selected language | Matches the final setup value |
| `status` | Request state | `processing`, `completed`, `partial`, or `failed` |
| `error` | Safe request-level error | Present when request-level processing fails |
| `created_at` | Creation time | History ordering |

The history list returns request metadata; request detail includes its generated documents.

### Processing Job

Existing status resource associated with the asynchronous request.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Processing ID | Returned on submission and used for polling |
| `status` | Processing state | `pending`, `running`, `done`, or `failed` |
| `result_id` | Tailoring request ID | Not a document ID |
| `error` | Safe processing error | Do not automatically resubmit on error |

### Tailored Document

One generated CV record.

| Field | Type/meaning | Rules |
|---|---|---|
| `id` | Document ID | Used for preview/download |
| `kind` | Document kind | `cv` in this feature |
| `scope` | Document scope | `per_job` or `general` |
| `job_id` | Single target job when applicable | May be null for general/group output |
| `job_ids` | Target job set | Always used to associate the document with its targets |
| `status` | Document state | `completed` or `failed` |
| `error`, `warning` | Per-document outcome details | Display when supplied |
| `filename` | Download filename | Present when document is available |
| `download_url` | Temporary download URL | Use authenticated document route for preview/download |
| `created_at` | Creation time | History/detail display |

The selected profile association is retained on the tailoring request; document/request detail is used to show which profile version produced the output.

## Output Count and State

For `n` selected jobs:

```text
per_job → n CV documents, each associated with one job
general → 1 CV document associated with all n jobs
```

```text
Tailoring request:
processing → completed
           → partial
           → failed

Processing job:
pending → running → done
                 → failed

Document:
processing → completed
           → failed
```

On processing `done`, load request details using `result_id`. Unknown statuses or transient status errors preserve the last confirmed state and never trigger a new request.

## Validation Rules

- The candidate must choose 1–10 distinct valid jobs from the launch source.
- The selected profile must belong to the authenticated candidate. For report-based setup, it must be exactly the profile associated with that report; if unavailable, block submission.
- Mode must be `per_job` or `general`; `per_job` is the client default.
- Output language must be non-empty and defaults to the selected profile's language.
- Cover-letter generation must remain disabled.
- Candidate facts must be grounded in the selected profile; job requirements are relevance context only.
- Only the owning candidate may retrieve request or document metadata or download a document.
