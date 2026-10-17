# Implementation Plan: Normalized Job Listing

**Branch**: `001-normalized-job-list` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-normalized-job-list/spec.md`

## Summary

Add a dedicated, filterable and paginated normalized-jobs page backed by the existing jobs API service. Keep the current `/jobs` workflow page intact and expose the new listing on its own route so this feature does not remove existing job-stage behavior. Keep filters and pagination in the URL query string, use the service's fixed newest-first order, and show explicit loading, empty, validation, and retryable error states.

## Technical Context

**Language/Version**: TypeScript 6.0; Angular 22 standalone application

**Primary Dependencies**: Angular Common/HttpClient, Router, Forms, RxJS, Bootstrap 5.3; reuse the existing `TipApi` service

**Storage**: N/A; listing state is query-string and in-memory UI state, while job records remain server-owned

**Testing**: Angular CLI unit-test builder with Vitest; `HttpTestingController` for API request/response tests; `npm run build` for production compilation

**Target Platform**: Existing supported web browsers for the Angular application

**Project Type**: Single-page web application

**Performance Goals**: Bound each default request to 20 results and avoid loading the complete job corpus into the browser. No response-time service-level target is specified.

**Constraints**: Use the configured environment base URL and existing HTTP/authentication pipeline; request `GET /jobs/normalize`; page defaults to 1 and limit defaults to 20; filters combine; sort remains `postingDate` descending; do not change the existing `/jobs` workflow.

**Scale/Scope**: One new listing route and navigation entry, one normalized-job API contract/model, and focused unit/HTTP tests. Total corpus size is owned by the service; the UI displays one requested page at a time.

## Constitution Check

The repository constitution contains only unfilled template placeholders and defines no ratified project principles or gates. The design follows established project conventions: a standalone routed page, shared API boundary, typed model, colocated tests, and no new runtime dependency or storage layer.

**Pre-design gate**: PASS — no applicable constitutional constraints or unjustified complexity.

## Project Structure

### Documentation (this feature)

```text
specs/001-normalized-job-list/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── normalized-jobs.md
```

### Source Code (repository root)

```text
src/app/
├── app.html                                      # Add navigation link
├── app.routes.ts                                 # Register /normalized-jobs
├── core/
│   ├── api/
│   │   ├── tip-api.ts                            # Add normalized-job listing request
│   │   └── tip-api.spec.ts                       # Verify URL, filters, and pagination
│   └── models/
│       └── normalized-job.ts                     # Listing, filters, and page types
└── pages/
    └── normalized-jobs/
        ├── normalized-jobs.ts                    # Query-driven standalone page
        ├── normalized-jobs.html                  # Filters, rows, and page controls
        ├── normalized-jobs.scss                  # Listing-specific presentation
        └── normalized-jobs.spec.ts               # UI states and user interactions
```

**Structure Decision**: Extend the existing single Angular application. Keep the workflow component at `/jobs`; add the normalized listing as a sibling page at `/normalized-jobs` and add a distinct primary-navigation link. Put the HTTP call and shared types at the existing API/model boundaries.

## Design Decisions

- Treat the URL query string as the source of truth for filter and pagination selections, using the existing router's query-parameter stream so refresh, deep links, and browser navigation preserve the current listing.
- Normalize query values at the page boundary: trim text filters, omit empty filters, require positive whole-number page and limit values, and use page 1/limit 20 when omitted.
- Reset to page 1 when filters or page size change. The API remains responsible for matching and ordering; the client does not sort or load all results for local filtering.
- Use RxJS `switchMap` for query changes and `takeUntilDestroyed` for page lifecycle cleanup so obsolete requests do not overwrite newer results. Keep loading, successful-empty, and error states distinct; retry the current query after a request failure.
- Map the backend's paginated response into one internal page model containing the current jobs, total result count, page, and limit. The confirmed wire envelope is `Items` (normalized job array), `limit` (integer), `total` (integer), and `page` (integer); map the capitalized `Items` property to the internal `items` field.
- Display an em dash for missing non-identifier values. Keep the row visible if a display value is blank; treat a missing identifier as invalid data and surface a load/data error rather than tracking an unstable row.

## Complexity Tracking

No constitutional violations or additional projects, services, dependencies, or storage systems are proposed.

## Post-Design Constitution Check

**Post-design gate**: PASS — design remains within the existing Angular application and follows its API, routing, and colocated-test conventions. No ratified constitution rules apply.
