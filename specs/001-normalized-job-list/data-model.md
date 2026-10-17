# Data Model: Normalized Job Listing

## NormalizedJob

Represents one normalized job posting returned by the jobs service.

| Field | Type | Required | Validation / display |
|---|---|---:|---|
| `id` | string | Yes | Non-empty stable identifier; used to identify a row |
| `title` | string or null | No | Display the supplied value; use an em dash when null or blank |
| `company` | string or null | No | Display the supplied value; use an em dash when null or blank |
| `location` | string or null | No | Display the supplied value; use an em dash when null or blank |
| `postingDate` | string or null | No | Service date value; display a consistent localized date or an em dash when absent |
| `source` | string or null | No | Display the supplied value; use an em dash when null or blank |

The API response's date representation must be preserved at the API boundary and rendered as a date without changing the server's ordering.

## JobListFilters

Represents the optional search criteria submitted together.

| Field | Type | Default / validation |
|---|---|---|
| `title` | string | Omitted when blank; trimmed; partial, case-insensitive matching |
| `company` | string | Omitted when blank; trimmed; partial, case-insensitive matching |
| `location` | string | Omitted when blank; trimmed; partial, case-insensitive matching |
| `source` | string | Omitted when blank; trimmed; exact source-value matching |

When multiple filter values are present, the service returns jobs that satisfy all of them. These matching semantics are assumptions recorded in the feature specification.

## JobListQuery

Combines `JobListFilters` with pagination state.

| Field | Type | Default / validation |
|---|---|---|
| `page` | positive integer | 1 |
| `limit` | positive integer | 20 |

Invalid page or limit values must be surfaced to the user for correction. Changing a filter or page size resets `page` to 1.

## NormalizedJobPage

Internal page model exposed to the page after adapting the service response.

| Field | Type | Description |
|---|---|---|
| `items` | `NormalizedJob[]` | Jobs on the requested page |
| `total` | non-negative integer | Total number of jobs matching all filters |
| `page` | positive integer | Current page |
| `limit` | positive integer | Maximum jobs requested for the page |

The service wire response contains `Items` (the current page's normalized jobs), `total` (the total number of matching jobs), `page` (the current page), and `limit` (the page size). The API adapter maps `Items` to `items`; the remaining fields map directly to the internal page model.

## Listing View State

The page presents one of the following mutually exclusive states for the current query:

- **Loading**: current query is in flight; earlier-query data is not presented as current results.
- **Results**: current query succeeded with one or more jobs.
- **Empty**: current query succeeded with no jobs.
- **Error**: current query failed or contained invalid pagination input; provide an actionable retry or correction path.
