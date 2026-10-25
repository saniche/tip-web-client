# Contract: Application Journal API

The user confirmed the endpoint family below. Request and response schemas are a working frontend contract because the backend source and OpenAPI definition were not available in this repository. Confirm field names, response envelopes, status encoding, and error bodies against the backend before release.

## Authentication

All application endpoints require the existing authenticated session. The backend scopes reads and mutations to the authenticated user. The client must not accept a user ID from the user as an ownership control.

## 1. List Applications

- **Method**: `GET`
- **Path**: `/applications/`
- **Query parameters**:
  - `page` (optional integer, default `1`, 1-based)
  - `limit` (optional integer, default `20`, subject to the backend's maximum)
  - `title` (optional string, case-insensitive partial match)
  - `company` (optional string, case-insensitive partial match)
  - `location` (optional string, case-insensitive partial match)
- **Ordering**: Backend creation date descending; client does not sort.

### Assumed success response

```json
{
  "items": [
    {
      "id": "application-123",
      "created_at": "2026-10-24T12:00:00Z",
      "updated_at": "2026-10-24T12:00:00Z",
      "status": "NotStarted",
      "job": {
        "id": "job-123",
        "title": "Senior Engineer",
        "company": "Example Corp",
        "location": "Remote",
        "posting_date": "2026-10-20",
        "url": "https://example.com/jobs/123",
        "source": "https://example.com/jobs/123"
      },
      "recruiter_name": null,
      "recruiter_email": null,
      "contact_date": null,
      "follow_up_date": null,
      "work_authorization_discussed": null,
      "notes": null,
      "status_history": [
        {
          "id": "history-1",
          "status": "NotStarted",
          "changed_at": "2026-10-24T12:00:00Z",
          "note": null
        }
      ]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## 2. Create an Application

- **Method**: `POST`
- **Path**: `/applications/`
- **Assumed request body**:

```json
{
  "job_id": "job-123",
  "recruiter_name": "Avery Recruiter",
  "recruiter_email": "avery@example.com",
  "contact_date": "2026-10-24",
  "follow_up_date": "2026-10-31",
  "work_authorization_discussed": true,
  "notes": "Initial conversation"
}
```

The client omits `status` by default so the backend can apply `NotStarted`. It does not issue a separate interest-deletion request. The backend performs the atomic interest-to-journal transition.

The assumed success response is the created entry, including a stable `id` and associated job. The UI navigates to the returned detail after success.

### Error handling

- `400` / `422`: validation error; show backend field messages where available.
- `401` / `403`: authentication/authorization feedback through existing app conventions.
- `409`: duplicate application for the job; show a duplicate-entry message.
- Network/`5xx`: show recoverable service feedback; preserve form input.

## 3. Get an Application

- **Method**: `GET`
- **Path**: `/applications/{application_id}/`
- **Assumed response**: One `ApplicationJournalEntry`, including the normalized job header and `status_history` in chronological order.
- **Errors**: `401`/`403` for authentication/authorization, `404` for unavailable or unauthorized entry, and a recoverable message for service/network failures.

## 4. Update Editable Application Fields

- **Method**: `PATCH`
- **Path**: `/applications/{application_id}/`
- **Assumed request body**: Only editable properties, using snake_case:

```json
{
  "recruiter_name": "Avery Recruiter",
  "recruiter_email": "avery@example.com",
  "contact_date": "2026-10-24",
  "follow_up_date": "2026-10-31",
  "work_authorization_discussed": true,
  "notes": "Updated note"
}
```

This operation does not include `job_id`, `status`, or `status_history`. A successful response is assumed to return the updated entry; the UI may reload the detail to ensure the display remains backend-authoritative.

## 5. Update Application Status

- **Method**: `PATCH`
- **Path**: `/applications/{application_id}/status`
- **Assumed request body**:

```json
{
  "status": "Interview",
  "note": "Technical interview scheduled"
}
```

`note` is optional. Supported values are `NotStarted`, `Registered`, `Applied`, `Contacted`, `Screening`, `Interview`, `OnHold`, and `Closed`. No client-side transition restrictions are added.

After success, the UI reloads the application detail and displays the authoritative current status and history.

## 6. Delete an Application

- **Method**: `DELETE`
- **Path**: `/applications/{application_id}/`
- **Success**: `200 OK` or `204 No Content`.
- **Behavior**: Delete only the application journal record. Do not delete the normalized job or recreate an interest.

## Common Client Behaviors

- Filters are trimmed and omitted when blank.
- Listing uses server-provided `page`, `limit`, and `total`; a changed filter or page size resets the requested page to 1.
- The client preserves returned item order and status-history order.
- History is read-only; all updates use the application edit or status operation.
- Exact payload and response aliases are subject to backend verification; do not treat the assumed JSON above as confirmed backend output.
