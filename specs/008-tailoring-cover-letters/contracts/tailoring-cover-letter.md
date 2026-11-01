# Existing Tailoring Contract with Optional Cover Letters

This contract describes the existing authenticated tailoring interface as used by the feature. It adds no route or separate request lifecycle. The frontend and backend must agree on the request fields and returned document records below.

## Create a tailoring request

The existing tailoring request shares selected jobs, profile, and language across CV and letter outputs:

```json
{
  "cover_letter": {
    "enabled": true,
    "mode": "per_job"
  },
  "cv_mode": "general",
  "job_ids": ["job-123", "job-456"],
  "output_language": "English",
  "profile_id": "profile-123"
}
```

Rules:

- `cover_letter.enabled` is an opt-in and defaults to `false` when omitted.
- If enabled, `cover_letter.mode` is required. If disabled, the client retains the existing `{ "enabled": false }` request shape and does not need to send a mode.
- `cv_mode` and `cover_letter.mode` are independent. Each accepts only `per_job` or `general`; invalid values are rejected.
- `per_job` means one document of that kind per selected job. `general` means one document of that kind for the selected job group.
- `job_ids`, `profile_id`, and `output_language` are shared; no letter-specific profile/job/language selection is submitted.
- Existing job count, ownership, normalization, authentication, and profile validation remain in force.
- A request with the letter setting omitted or disabled remains CV-only.

## Accepted response and processing

The existing creation response remains `202 Accepted` and returns a processing-job identifier, current status, request identifier in `result_id`, and any existing error field:

```json
{
  "id": "processing-job-id",
  "status": "pending",
  "result_id": "tailoring-request-id",
  "error": null
}
```

The current processing status resource continues to report `pending`, `running`, `done`, or `failed`. Request status progresses from `processing` to `completed`, `partial`, or `failed`. A completed CV must remain available when a letter fails, and a completed letter must remain available when a CV fails.

## Request history and document detail

The existing history list returns the request's shared session metadata, including jobs, profile, language, modes, status, and creation time. Request detail returns the documents array. A cover letter is returned as another document record:

```json
{
  "id": "letter-document-id",
  "kind": "cover_letter",
  "scope": "per_job",
  "job_id": "job-123",
  "job_ids": ["job-123"],
  "status": "completed",
  "error": null,
  "warning": null,
  "filename": "candidate-company-cover-letter.md",
  "download_url": "temporary-url-or-null",
  "created_at": "timestamp"
}
```

Document statuses and errors are interpreted per document, not inferred from the request status. The same document identifier and authenticated Markdown download path used for CVs serve letter preview and download. Existing request/document delete operations remain shared where the client exposes them.

## Retry

The current client offers whole-request retry only for a request whose overall status is `failed`; it does not offer a per-document retry for partial requests. A retry of a failed request must resubmit the original letter enablement and mode along with the original shared context. No per-output retry endpoint is part of this contract.
