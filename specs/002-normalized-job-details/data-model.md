# Data Model: Normalized Job Details

## NormalizedJobDetail

Represents the complete normalized posting returned for a route-selected job.

| Field                                 | Type                      | Required | Rules / display behavior                                                                           |
| ------------------------------------- | ------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| `id`                                  | string                    |      Yes | Non-blank identifier; route and write operations use this value.                                   |
| `url`                                 | string or null            |       No | Link only when non-blank and `source` is not email.                                                |
| `title`                               | string or null            |       No | Read-only; show a placeholder when blank.                                                          |
| `company`                             | string or null            |       No | Editable with write access.                                                                        |
| `location`                            | string or null            |       No | Editable with write access.                                                                        |
| `salary`                              | string, number, or null   |       No | Editable with write access; display numeric values without assuming the server returns text.       |
| `source`                              | string or null            |       No | Editable with write access; email disables the URL link.                                           |
| `posting_date` / client `postingDate` | date/string or null       |       No | Read-only; show a placeholder when unavailable.                                                    |
| `summary`                             | string or null            |       No | Read-only long-form content.                                                                       |
| `key_responsibilities`                | string, string[], or null |       No | Read-only content rendered as a list; arrays are displayed item-by-item and text is split by line. |
| `requirements`                        | string, string[], or null |       No | Read-only content rendered as a list; arrays are displayed item-by-item and text is split by line. |
| `desirables`                          | string, string[], or null |       No | Read-only content rendered as a list; arrays are displayed item-by-item and text is split by line. |
| `tools_and_technologies`              | string[] or null          |       No | Read-only list; show a placeholder when empty.                                                     |
| `additionals`                         | string[] or null          |       No | Read-only list; show a placeholder when empty.                                                     |
| `status`                              | string                    |      Yes | Display processing, completed, or failed state distinctly.                                         |
| `submitter_id`                        | string or null            |       No | Read-only identifier; show a placeholder when unavailable.                                         |
| `created_at`                          | date/string or null       |       No | Read-only creation date; show a placeholder when unavailable.                                      |
| `has_write_access`                    | boolean                   |      Yes | Authoritative permission for edit/delete controls.                                                 |

The client model may use the repository's camelCase conventions when mapping server fields, while preserving server names at the HTTP boundary.

## EditableJobHeader

The only update payload supported by the feature:

| Field      | Type           | Rules                                  |
| ---------- | -------------- | -------------------------------------- |
| `company`  | string or null | Represents the current company value.  |
| `location` | string or null | Represents the current location value. |
| `salary`   | string or null | Represents the current salary value.   |
| `source`   | string or null | Represents the current source value.   |

No title, URL, generated content, status, submitter, creation date, or permission field may be sent as an editable value.

## State transitions

- `loading` -> `loaded` when the detail response is valid.
- `loading` -> `not-found` when the requested job does not exist.
- `loading` -> `error` when the detail request fails; retry returns to `loading`.
- `loaded` -> `editing` only when `has_write_access` is true.
- `editing` -> `loaded` after a successful update or cancellation.
- `editing` -> `editing-error` after a failed update; entered values remain available for retry.
- `loaded` -> `delete-confirmation` when a permitted user requests deletion.
- `delete-confirmation` -> `loaded` on cancellation.
- `delete-confirmation` -> `deleting` on confirmation.
- `deleting` -> `listing` after successful deletion.
- `deleting` -> `delete-error` after failure; the detail remains available.
