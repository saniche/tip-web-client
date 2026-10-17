# Normalized Jobs Listing Contract

## Request

`GET {environment.baseUrl}/jobs/normalize`

Optional query parameters:

| Parameter | Meaning |
|---|---|
| `title` | Partial, case-insensitive title filter |
| `company` | Partial, case-insensitive company filter |
| `location` | Partial, case-insensitive location filter |
| `source` | Exact source-value filter |
| `page` | 1-based page number; defaults to `1` |
| `limit` | Maximum results per page; defaults to `20` |

Empty filter values are omitted. Multiple filters are combined conjunctively. The service owns the fixed `postingDate` descending order; the client does not send a sort parameter.

## Response

The response envelope is:

| Field | Type | Meaning |
|---|---|---|
| `Items` | `NormalizedJob[]` | Jobs on the requested page |
| `limit` | integer | Page size |
| `total` | integer | Total jobs matching the filters |
| `page` | integer | Current 1-based page |

Each job record contains `id`, `title`, `company`, `location`, `postingDate`, and `source`. Map `Items` to the internal `items` field in `NormalizedJobPage`, documented in [data-model.md](../data-model.md).

## Error Handling

- Invalid page or limit values produce a user-visible validation state with a correction path.
- A failed request produces a user-visible error and a retry action for the current query.
- A successful response with no matching records produces the empty-results state, not an error.
