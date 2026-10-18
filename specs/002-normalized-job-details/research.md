# Research: Normalized Job Details

## Decision: Use the existing standalone Angular page and `TipApi` service

- **Decision**: Add a dedicated standalone detail page under `src/app/pages/normalized-job-detail/`, register a route with an `id` parameter, and keep server calls in `TipApi`.
- **Rationale**: The normalized listing already uses a lazy-loaded standalone page and the shared API service. This preserves the repository's existing composition, dependency injection, loading/error handling, and testing patterns.
- **Alternatives considered**: An embedded detail component was rejected because the requirement is a page addressed by job ID and direct navigation must remain possible.

## Decision: Use route parameter loading with cancellation for changing IDs

- **Decision**: Read the route parameter as an observable and use an RxJS `switchMap` flow so a new ID supersedes an older detail request.
- **Rationale**: The listing already uses observable route state and `switchMap` to prevent stale responses.
- **Alternatives considered**: Manual subscriptions with request tokens were rejected because they duplicate existing observable patterns.

## Decision: Use `PATCH /jobs/{job_id}` for editable header details and `DELETE /jobs/{job_id}` for deletion

- **Decision**: Model update as a partial update containing only `company`, `location`, `salary`, and `source`; model deletion as a delete operation on the same resource path. The detail operation is `GET /jobs/{job_id}`.
- **Rationale**: Partial update matches the narrow edit scope and prevents accidental replacement of read-only generated content. Reusing the resource path for deletion is the conventional REST contract.
- **Alternatives considered**: `PUT` was rejected because the page does not own the complete job representation. Separate action URLs were rejected because no workflow action beyond deletion is needed.
- **Boundary**: The feature description specified only the GET path. The contract records these update/delete paths as implementation assumptions to verify against the server; if the server differs, the change is isolated to `TipApi` and its contract tests.

## Decision: Use server-provided `has_write_access` as the only UI permission source

- **Decision**: Render edit and delete controls only when the loaded detail has `has_write_access: true`; keep all other fields read-only.
- **Rationale**: This field is explicitly defined as the permission signal. Client-side role inference would risk exposing controls incorrectly.
- **Alternatives considered**: Deriving permissions from submitter identity or local auth state was rejected because neither is authoritative for this feature.

## Decision: Preserve failed form input and show explicit operation states

- **Decision**: Use a form model initialized from the loaded detail, track loading/saving/deleting/error states, and retain entered values when update fails.
- **Rationale**: This satisfies retry and no-false-success scenarios while making asynchronous operations understandable.
- **Alternatives considered**: Reloading after every failed update was rejected because it discards the attempted correction.
