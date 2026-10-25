# Data Model: Application Journal UI

## Entities and Schemas

### 1. ApplicationJournalEntry

Represents one user's record of pursuing a normalized job.

| Field                        | Type                              | Description                                                          | Nullable |
| :--------------------------- | :-------------------------------- | :------------------------------------------------------------------- | :------: |
| `id`                         | `string`                          | Unique application journal identifier                                |    No    |
| `createdAt`                  | `string`                          | ISO 8601 creation timestamp; determines listing order on the backend |    No    |
| `updatedAt`                  | `string`                          | ISO 8601 update timestamp                                            |   Yes    |
| `status`                     | `ApplicationStatus`               | Current backend-managed status                                       |    No    |
| `job`                        | `NormalizedJob`                   | Normalized job header referenced by this entry                       |    No    |
| `recruiterName`              | `string`                          | Recruiter name                                                       |   Yes    |
| `recruiterEmail`             | `string`                          | Recruiter email                                                      |   Yes    |
| `contactDate`                | `string`                          | Contact date, represented as a date-only value                       |   Yes    |
| `followUpDate`               | `string`                          | Follow-up date, represented as a date-only value                     |   Yes    |
| `workAuthorizationDiscussed` | `boolean`                         | Whether work authorization was discussed                             |   Yes    |
| `notes`                      | `string`                          | User notes                                                           |   Yes    |
| `statusHistory`              | `ApplicationStatusHistoryEntry[]` | Backend-managed status history, chronological as returned            |   Yes    |

### 2. NormalizedJob

The backend-owned job record associated by identifier; the client displays the returned header and does not create a second copy.

| Field         | Type     | Description                               | Nullable |
| :------------ | :------- | :---------------------------------------- | :------: |
| `id`          | `string` | Normalized job identifier                 |    No    |
| `title`       | `string` | Job title                                 |   Yes    |
| `company`     | `string` | Company name                              |   Yes    |
| `location`    | `string` | Job location                              |   Yes    |
| `postingDate` | `string` | Job posting date                          |   Yes    |
| `url`         | `string` | Original posting URL                      |   Yes    |
| `source`      | `string` | Source label or source URL, when provided |   Yes    |

### 3. ApplicationStatus

Supported status values and their user-facing labels:

| Backend value | UI label    |
| :------------ | :---------- |
| `NotStarted`  | Not started |
| `Registered`  | Registered  |
| `Applied`     | Applied     |
| `Contacted`   | Contacted   |
| `Screening`   | Screening   |
| `Interview`   | Interview   |
| `OnHold`      | On hold     |
| `Closed`      | Closed      |

The initial status defaults to `NotStarted` on the backend. The client does not enforce status-transition rules.

### 4. ApplicationStatusHistoryEntry

An immutable backend record of a status transition.

| Field       | Type                | Description                            | Nullable |
| :---------- | :------------------ | :------------------------------------- | :------: |
| `id`        | `string`            | Unique history identifier, if supplied |   Yes    |
| `status`    | `ApplicationStatus` | Status recorded by this history event  |    No    |
| `changedAt` | `string`            | ISO 8601 event timestamp               |    No    |
| `note`      | `string`            | Optional explanation for the change    |   Yes    |

### 5. ApplicationFilters and ApplicationPage

| Field      | Type                        | Description                                                       |
| :--------- | :-------------------------- | :---------------------------------------------------------------- |
| `title`    | `string`                    | Optional case-insensitive partial job-title filter                |
| `company`  | `string`                    | Optional case-insensitive partial company filter                  |
| `location` | `string`                    | Optional case-insensitive partial location filter                 |
| `page`     | `number`                    | 1-based page; defaults to 1                                       |
| `limit`    | `number`                    | Requested page size; defaults to 20 and is bounded by the backend |
| `items`    | `ApplicationJournalEntry[]` | Entries on the requested page                                     |
| `total`    | `number`                    | Number of matching entries across all pages                       |

## Validation and Ownership

- The backend authenticates the user and scopes all application records to that user.
- The selected job must identify an existing normalized job; the backend validates existence and duplicate-entry constraints.
- Recruiter, contact date, follow-up date, work authorization, and notes are the only ordinary editable fields.
- Status changes are performed only through the status-update operation and optional note.
- History records are read-only to the client.
- The backend owns the atomic transition from interest to journal entry.
- Deleting an application journal entry does not delete the normalized job and does not recreate an interest.

## State Transitions

### Listing

```text
[Loading]
   ├── response with items ──► [Results]
   ├── response without items ──► [Empty]
   └── request failure ──► [Error + Retry]
```

Filter and pagination changes replace the active query; only the latest query response can update displayed results.

### Create and Edit

```text
[Editing] ── submit ──► [Saving]
  ├── success ──► [Saved entry]
  ├── duplicate/validation failure ──► [Editing + message]
  └── network/authorization failure ──► [Editing + message]
```

### Status Change

```text
[Current backend status] ── submit status + optional note ──► [Updating]
  ├── success + refresh ──► [Current backend status + backend history]
  └── failure ──► [Previous displayed state + message]
```

### Delete

```text
[Entry] ── request delete ──► [Confirmation]
  ├── cancel ──► [Entry]
  └── confirm ──► [Deleting]
       ├── success ──► [Entry removed; valid listing]
       └── failure ──► [Entry retained + message]
```

## Wire-Format Assumptions to Verify

The route family is user-confirmed, but backend schemas are absent from this repository. The implementation assumes a paginated response `{ items, page, limit, total }`, embedded `job` and `status_history`, and snake_case request fields (`job_id`, `recruiter_name`, `contact_date`, `follow_up_date`, `work_authorization_discussed`). Response mappers will support common snake_case/camelCase aliases. Confirm these details against the backend before release.
