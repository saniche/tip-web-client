# CV Tailoring API Contract

**Status**: Existing API; no contract changes proposed  
**Base path**: `/api/v1`  
**Authentication**: Existing bearer-token authentication

## List profile versions

### `GET /api/v1/profiles`

Returns the authenticated candidate's owned profile versions. Each summary includes:

```json
{
  "id": "profile-id",
  "label": "Profile label",
  "output_language": "English",
  "is_default": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

The client uses the selected profile ID and language. It does not submit profile data.

## Use matching report job context

### `GET /api/v1/matching/reports` and `GET /api/v1/matching/reports/{report_id}`

Reuse the existing matching report list and detail responses. Find the exact report by ID in the list to obtain its `profile_id`; the current detail response contains the result `job_id` values but does not include `profile_id`. The request must include only selected, valid job IDs from this report and must use the exact report `profile_id`. If the report summary or its profile is unavailable, block report-based submission rather than substituting another profile.

## Create a tailoring request

### `POST /api/v1/tailoring`

Example request for a candidate-selected set:

```json
{
  "job_ids": ["normalized-job-id-1", "normalized-job-id-2"],
  "profile_id": "candidate-profile-id",
  "cv_mode": "general",
  "cover_letter": {
    "enabled": false
  },
  "output_language": "French"
}
```

Rules:

- `job_ids`: one to ten distinct job IDs accumulated from normalized-job details, or selected from a single matching report.
- `profile_id`: selected candidate-owned profile version. For report-based setup, it must exactly match the report's `profile_id`; for job-detail setup, the candidate may choose any owned profile version.
- `cv_mode`: `"per_job"` or `"general"`; client default is `"per_job"`.
- `per_job`: one CV document per selected job.
- `general`: one CV document tailored to the entire selected job group.
- `cover_letter.enabled`: always `false`.
- `output_language`: final editable value; client initializes it from the selected profile.
- Do not submit profile contents or start a separate matching operation.

Accepted response: `202 Accepted`

```json
{
  "id": "processing-job-id",
  "status": "pending",
  "result_id": "tailoring-request-id",
  "error": null
}
```

`id` is the processing-job ID. `result_id` is the tailoring-request ID, not a document ID.

## Track processing

### `GET /api/v1/processing-jobs/{processing_job_id}`

```json
{
  "id": "processing-job-id",
  "status": "pending | running | done | failed",
  "result_id": "tailoring-request-id",
  "error": null
}
```

- Poll while `pending` or `running`.
- On `done`, load request detail using `result_id`.
- On `failed`, show the supplied error and offer an explicit retry.
- On unknown status or temporary GET failure, preserve the last confirmed state and do not automatically resubmit.

## List requests and retrieve documents

### `GET /api/v1/tailoring/requests`

Returns the authenticated candidate's requests ordered by creation time. Request fields include `id`, `status`, `error`, `job_ids`, `profile_id`, `cv_mode`, `cover_letter`, `output_language`, and `created_at`.

### `GET /api/v1/tailoring/requests/{request_id}`

Returns request metadata and the request's `documents` array. Document metadata includes:

```json
{
  "id": "document-id",
  "kind": "cv",
  "scope": "general",
  "job_id": null,
  "job_ids": ["normalized-job-id-1", "normalized-job-id-2"],
  "status": "completed",
  "error": null,
  "warning": null,
  "filename": "tailored-cv.md",
  "download_url": "temporary-url-or-null",
  "created_at": "timestamp"
}
```

`per_job` requests may contain multiple document records; `general` requests contain one document associated with the selected job set.

## Preview and download

### `GET /api/v1/tailoring/documents/{document_id}/download`

Returns the Markdown document body with `text/markdown` content type and a download disposition. Use this authenticated route through the API client for preview and download. Render preview content as escaped read-only text; never inject it as HTML.

## Errors and authorization

- `401`: authentication required.
- `404`: selected profile, job, request, or document is unavailable to the candidate.
- `400`: selected job normalization is not complete.
- `422`: request values fail schema validation, including job count or mode.
- Processing/provider failures after acceptance appear in processing/request/document status and error fields.
- The backend scopes profile list, request list/detail, and document download to the authenticated candidate. Client-side filtering is not an authorization boundary.
