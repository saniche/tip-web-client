# Contract: Interest Management API

## Endpoints

### 1. List User Interests

- **Method**: `GET`
- **Path**: `/jobs/interests`
- **Authentication**: Bearer Token required
- **Query Parameters**:
  - `page` (optional, integer, default: `1`): 1-based page index.
  - `limit` (optional, integer, default: `20`): Page size limit.
  - `title` (optional, string): Case-insensitive partial match for job title.
  - `company` (optional, string): Case-insensitive partial match for company name.
  - `location` (optional, string): Case-insensitive partial match for job location.

#### Response: `200 OK`
```json
{
  "items": [
    {
      "id": "interest-12345",
      "createdAt": "2026-10-22T20:30:00Z",
      "userId": "user-uuid-1",
      "job": {
        "id": "job-uuid-1",
        "title": "Senior Frontend Engineer",
        "company": "Acme Corp",
        "location": "Remote",
        "postingDate": "2026-10-20T12:00:00Z",
        "source": "https://example.com/jobs/123"
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 42
}
```

#### Error Responses
- `401 Unauthorized`: Missing or expired auth token.
- `500 Internal Server Error`: Service failure.

---

### 2. Add Job to Interests

- **Method**: `POST`
- **Path**: `/jobs/{job_id}/interest`
- **Authentication**: Bearer Token required
- **Path Parameters**:
  - `job_id` (string, required): The ID of the normalized job.
- **Request Body**: Empty or `{}`.

#### Response: `200 OK` or `201 Created`
```json
{
  "status": "success",
  "jobId": "job-uuid-1"
}
```

#### Error Responses
- `400 Bad Request`: Invalid job identifier.
- `401 Unauthorized`: Missing or expired authentication token.
- `404 Not Found`: Job does not exist.
- `409 Conflict`: Job is already in user's interests.

---

### 3. Remove Job from Interests

- **Method**: `DELETE`
- **Path**: `/jobs/{job_id}/interest`
- **Authentication**: Bearer Token required
- **Path Parameters**:
  - `job_id` (string, required): The ID of the normalized job.

#### Response: `200 OK` or `204 No Content`

#### Error Responses
- `401 Unauthorized`: Missing or expired authentication token.
- `404 Not Found`: Interest or job does not exist.
- `500 Internal Server Error`: Server error during deletion.

## Normalized Job Detail Interest State

The authenticated `GET /jobs/{job_id}` and `PATCH /jobs/{job_id}` responses must include
`is_interested` as a boolean for the current user. The detail page uses this value to select
the correct Add or Remove action; it must not assume that a job is not of interest when the
status is unavailable.
