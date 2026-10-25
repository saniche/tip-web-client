# Data Model: Interest Management UI

## Entities and Schemas

### 1. JobInterest

Represents a user's recorded interest in a normalized job posting.

| Field | Type | Description | Nullable |
|:---|:---|:---|:---:|
| `id` | `string` | Unique identifier of the interest record | No |
| `createdAt` | `string` | ISO 8601 timestamp when the interest was recorded | No |
| `userId` | `string` | Identifier of the authenticated user owning the interest | Yes |
| `job` | `NormalizedJobHeader` | Associated normalized job entity header | No |

### 2. NormalizedJobHeader

Summary representation of the normalized job attached to the interest.

| Field | Type | Description | Nullable |
|:---|:---|:---|:---:|
| `id` | `string` | Unique identifier of the normalized job | No |
| `title` | `string` | Job title | Yes |
| `company` | `string` | Company or employer name | Yes |
| `location` | `string` | Work location or remote description | Yes |
| `postingDate` | `string` | ISO 8601 or string formatted job posting date | Yes |
| `source` | `string` | Source name or URL to the original job posting | Yes |

### 3. JobInterestFilters

Query filters used when searching and filtering the interest list.

| Field | Type | Description | Notes |
|:---|:---|:---|:---|
| `title` | `string` | Case-insensitive substring match on job title | Optional |
| `company` | `string` | Case-insensitive substring match on company name | Optional |
| `location` | `string` | Case-insensitive substring match on location | Optional |

### 4. JobInterestQuery

Extends `JobInterestFilters` with pagination parameters.

| Field | Type | Default | Description |
|:---|:---|:---|:---|
| `page` | `number` | `1` | 1-based page index |
| `limit` | `number` | `20` | Maximum records returned per page |

### 5. JobInterestsPage (Response Envelope)

Paginated response returned by the `GET /jobs/interests` endpoint.

| Field | Type | Description |
|:---|:---|:---|
| `items` | `JobInterest[]` | Array of interest items for the current page |
| `page` | `number` | Current 1-based page number |
| `limit` | `number` | Records per page limit |
| `total` | `number` | Total matching interest records across all pages |

---

## State Transitions

### Interest Listing State
- `loading`: Request is in flight to load interests for current query params.
- `results`: Successful response with 1 or more items.
- `empty`: Successful response with 0 items (distinguishing between "no interests yet" vs "no search results").
- `error`: Network, auth, or server error encountered during fetch.

### Interest Removal State (Per Item)
```text
[Idle]
  │ Click "Remove"
  ▼
[Confirmation Prompt] ── Cancel ──► [Idle]
  │ Confirm
  ▼
[Deleting (In-Flight)]
  ├── Success ──► [Item Removed / Page Reloaded / Boundary Adjusted]
  └── Failure ──► [Idle + Error Feedback Displayed]
```

### Job Detail Interest Toggle State
```text
[Current State: Interested / Not Interested]
  │ Click Toggle Action
  ▼
[Action In-Flight (Disabled / Loading Feedback)]
  ├── Success (POST / DELETE) ──► [Inverted State: Not Interested / Interested]
  └── Failure (POST / DELETE) ──► [Revert State + Error Message Displayed]
```
