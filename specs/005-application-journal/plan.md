# Implementation Plan: Application Journal UI

**Branch**: `005-application-journal` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-application-journal/spec.md`

## Summary

Implement an authenticated server-backed application journal. Reuse the existing Angular standalone page, `TipApi`, normalized job list API, route query parameter, reactive form, and Vitest test patterns. The client sends filters and page metadata to the backend, preserves its order, treats status/history as authoritative, and never duplicates the atomic interest-to-journal transition.

## Technical Context

**Language/Version**: TypeScript ~6.0.2, HTML, SCSS

**Primary Dependencies**: Angular 22.1 standalone components, Angular Router/HTTP/Reactive Forms, RxJS 7.8, Bootstrap 5.3

**Storage**: Backend application API; client view state and list query in URL parameters

**Testing**: Vitest 4 with Angular component and HTTP testing utilities (`npm test`)

**Target Platform**: Modern web browsers

**Project Type**: Angular single-page frontend

**Performance Goals**: Debounce search input by 300 ms; cancel stale listing and job-selector requests; disable duplicate form submissions while requests are pending.

**Constraints**: Authenticated access; server-side filtering/pagination; default page size 20; backend ordering preserved; job data/status/history remain backend-owned; do not delete interests during create; no client-side status-transition rules; backend request/response schema assumptions must be checked.

**Scale/Scope**: One authenticated list route, one entry create/detail/edit route, journal API/model coverage, and focused tests.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The checked-in `.specify/memory/constitution.md` is an unfilled template and contains no ratified project-specific gates. The approach follows existing project conventions:

- Keep API integration in the shared `TipApi` service and data contracts in typed core models.
- Keep pages independently testable and use explicit loading, empty, validation, and service-error states.
- Test server query construction, response mapping, stale-request cancellation, and submission/error behavior.
- Avoid adding a new state-management dependency or duplicating backend business rules.

**Gate result**: Pass; no applicable constitution violation identified.

## Project Structure

### Documentation (this feature)

```text
specs/005-application-journal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── application-api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/app/
├── app.html                                  # Add authenticated journal navigation
├── app.routes.ts                             # Guard list/create/detail routes
├── core/
│   ├── api/
│   │   ├── tip-api.ts                        # List, get, create, update, status, delete
│   │   └── tip-api.spec.ts                   # Request and response contract tests
│   └── models/
│       └── application-journal.ts            # Entry, status/history, query, pagination
└── pages/
    └── application-journal/
        ├── application-journal.ts             # Authenticated server-filtered list
        ├── application-journal.html
        ├── application-journal.scss
        ├── application-journal.spec.ts
        ├── application-journal-entry.ts       # Create/detail/edit/status/history
        ├── application-journal-entry.html
        ├── application-journal-entry.scss
        └── application-journal-entry.spec.ts
```

**Structure Decision**: Extend the existing single Angular client. Use separate list and entry components, with `/applications`, `/applications/new`, and `/applications/:id` routes. The create form reuses `TipApi.listNormalizedJobs` for a server-searchable selector; no new job model or application aggregation page is introduced.

## Component Responsibilities

- **`ApplicationJournal`**: Parse and maintain list query parameters, debounce and combine server filters, cancel stale requests, display backend-ordered entries and pagination metadata, and handle loading/empty/error/retry and invalid-page states.
- **`ApplicationJournalEntry`**: Handle create/detail/edit, search and select any normalized job, validate editable fields, submit status changes and reload authoritative history, and confirm deletion without mutating the normalized job or interests.
- **`TipApi`**: Own all journal HTTP paths, query/body construction, status values, and response mapping. Expose normalized job search through its existing API method.
- **Journal models**: Define typed entry, normalized header, status/history, filter/page, and create/edit request shapes; ensure only editable fields are sent by ordinary edits.
- **Routes and app navigation**: Guard list/create/detail routes with the existing auth guard and expose the journal from primary navigation.
- **Automated tests**: Cover API contract behavior, listing and stale-query states, create/edit validation and duplicate prevention, status/history refresh, and deletion boundaries.

## Design and Contract Notes

- Confirmed routes: `GET|POST /applications/`, `GET|PATCH|DELETE /applications/{application_id}/`, and `PATCH /applications/{application_id}/status`.
- Assumed query contract: `page`, `limit`, `title`, `company`, `location`; assumed page envelope: `{ items, page, limit, total }`.
- Assumed create request uses `job_id`; editable fields and status values are defined in [contracts/application-api.md](contracts/application-api.md).
- Response mapping will support snake_case/camelCase names where practical. These wire shapes remain assumptions until checked against the backend.
- GET entry is assumed to return the associated job header and chronological status history; successful status changes reload GET entry.
- The UI confirms deletion, changes only the journal entry, and reloads/navigates to a valid list page.

## Complexity Tracking

No constitution violations or new architectural dependencies.
