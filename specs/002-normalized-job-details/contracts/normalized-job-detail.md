# Normalized Job Detail Contract

Base URL and authentication follow the existing `TipApi` and auth-interceptor configuration.

## Read detail

`GET /jobs/{job_id}`

The response is a single normalized job detail object:

```json
{
  "id": "job-123",
  "url": "https://source.example/jobs/123",
  "title": "Senior Engineer",
  "company": "Northwind",
  "location": "Remote",
  "salary": "$150,000",
  "source": "career-site",
  "posting_date": "2026-10-13",
  "summary": "Role summary",
  "key_responsibilities": "Responsibilities",
  "requirements": "Requirements",
  "desirables": "Desirables",
  "tools_and_technologies": ["TypeScript"],
  "additionals": ["Remote work"],
  "status": "completed",
  "submitter_id": "user-1",
  "created_at": "2026-10-13T12:00:00Z",
  "has_write_access": true
}
```

The client maps server field names to the repository's model naming convention where needed.
The client prefers `tools_and_technologies`; for backward compatibility it falls back to the legacy `technical_stack` or `technicalStack` field when the preferred field is absent or null.

## Update header details

`PATCH /jobs/{job_id}`

Request body contains only the editable fields:

```json
{
  "company": "Northwind",
  "location": "Remote",
  "salary": "$155,000",
  "source": "career-site"
}
```

The successful response is the updated normalized job detail object. A failed response must be surfaced as an unsuccessful save; the client must not replace the form with an unconfirmed value.

## Delete job

`DELETE /jobs/{job_id}`

A successful response indicates that the job was deleted. The client then navigates to `/normalized-jobs`. A failed response leaves the detail page visible and offers retry.

## UI route contract

`/normalized-jobs/:id`

- A valid `id` loads one detail record.
- Missing or blank IDs show an unavailable state.
- The page provides a return link to `/normalized-jobs`.
- Edit and delete controls are rendered only when `has_write_access` is true.

## Contract assumption

The feature description explicitly supplied the GET path but not write paths. `PATCH /jobs/{job_id}` and `DELETE /jobs/{job_id}` are the planned server contract. Confirm the server's exact update/delete methods and field casing during implementation; only `TipApi` methods and focused HTTP tests should need adjustment if the backend differs.
