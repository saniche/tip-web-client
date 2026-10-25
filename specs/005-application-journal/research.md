# Research: Application Journal UI

## Decision: Reuse the established standalone Angular page architecture

**Rationale**: The client already uses standalone routed pages, `TipApi` for HTTP access, typed core models, signals for view state, and RxJS for request lifecycles. The Interests page provides the closest listing precedent, including route-backed filters and pagination, loading/empty/error/retry states, and stale-request cancellation.

**Alternatives considered**: Adding a new state-management library or aggregating journal data in the dashboard. Neither is needed for this focused, server-authoritative feature.

## Decision: Use the backend as the authority for filtering, pagination, status, and history

**Rationale**: The backend owns user scoping, case-insensitive partial matching, ordering by journal creation date, page-size limits, status transitions, history events, and the atomic interest-to-journal creation transition. The client will pass filters and pagination to the list operation and will not sort, filter only a displayed page, modify history, or remove interests independently.

**Alternatives considered**: Client-side filtering or sorting. These would produce incomplete or conflicting results and could violate the required ordering and ownership behavior.

## Decision: Use an in-flow normalized-job search selector for creation

**Rationale**: The user confirmed that an applicant may choose any existing normalized job. `TipApi.listNormalizedJobs` already supports server-side title/company/location filtering and pagination. The create flow can reuse it without duplicating normalized job data or requiring a detail-page entry point.

**Alternatives considered**: Requiring creation from a normalized-job detail page. This would prevent choosing a job from the journal workflow and conflict with the user's selection.

## Decision: Use the confirmed application endpoint family and document unresolved wire-format assumptions

**Rationale**: The user confirmed these routes:

- `GET /applications/` and `POST /applications/`
- `GET`, `PATCH`, and `DELETE /applications/{application_id}/`
- `PATCH /applications/{application_id}/status`

No backend source, OpenAPI schema, or response examples are present in this frontend repository. The contract therefore records an explicit working schema: `page`, `limit`, `title`, `company`, and `location` query parameters; a paginated `{ items, page, limit, total }` response; a `job_id` create field; snake_case request fields; and an embedded normalized job plus status history. Response mapping will accept snake_case and camelCase aliases where practical. These assumptions must be checked against the running backend before release.

**Alternatives considered**: Inventing additional routes for history or job selection. The provided detail GET and status PATCH routes are sufficient for the UI; status history is read from the detail resource.

## Decision: Let the backend default the initial status

**Rationale**: Creation omits an initial status unless the backend exposes and requires it. This preserves the specified `NotStarted` default and avoids sending a status that could bypass backend policy.

**Alternatives considered**: Setting `NotStarted` in the create form. This risks duplicating backend defaults or sending an unsupported field.

## Decision: Treat history as immutable and render in backend order

**Rationale**: Status changes go only through the status endpoint; ordinary edits touch only recruiter/contact/work-authorization/notes fields. History is displayed in the order returned, without edit/delete controls.

**Alternatives considered**: Sorting or mutating history in the client. The requirement makes the backend response the ordering authority and history immutable.

## Decision: Offer confirmed deletion because the route is supported

**Rationale**: The user confirmed a DELETE operation for an application entry. The UI will require confirmation, refresh or return to a valid listing page after success, and never delete the referenced normalized job or recreate an interest.

**Alternatives considered**: Omitting deletion. This is unnecessary because backend support has been confirmed.
