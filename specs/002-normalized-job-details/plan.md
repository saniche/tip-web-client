# Implementation Plan: Normalized Job Details

**Branch**: `002-normalized-job-details` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-normalized-job-details/spec.md`

## Summary

Add a route-addressable detail page for one normalized job. Reuse the existing `TipApi` and standalone Angular page conventions, extend the normalized-job model with the server detail shape, and expose read-only detail rendering plus permission-gated header editing and deletion. The page will load by route ID, cancel stale requests when the ID changes, preserve unsaved form values on failed writes, and return to the normalized listing after deletion.

## Technical Context

**Language/Version**: TypeScript 6.0 with Angular 22 standalone components

**Primary Dependencies**: Angular Router, HttpClient, Reactive Forms, RxJS 7.8, Bootstrap 5.3

**Storage**: N/A; the existing server is the source of truth

**Testing**: Vitest through Angular's test builder, Angular HTTP testing utilities

**Target Platform**: Browser-based Angular application

**Project Type**: Web application frontend

**Performance Goals**: Show loading feedback immediately and render a successful detail response without unnecessary follow-up requests; preserve the existing listing's responsive interaction.

**Constraints**: Do not expose edit/delete actions without the server-provided permission; do not show stale details after a route ID or operation changes; keep non-editable fields read-only.

**Scale/Scope**: One detail route and page, one detail model, three API operations (GET, PATCH, DELETE), and focused unit/component tests. No new authentication or listing behavior.

## Constitution Check

The constitution file contains only unfilled template placeholders and therefore defines no enforceable project principles or gates. No violations or exceptions are identified.

## Project Structure

```text
src/
└── app/
    ├── core/
    │   ├── api/
    │   │   └── tip-api.ts
    │   └── models/
    │       └── normalized-job.ts
    ├── pages/
    │   ├── normalized-jobs/
    │   │   └── normalized-jobs.html
    │   └── normalized-job-detail/
    │       ├── normalized-job-detail.ts
    │       ├── normalized-job-detail.html
    │       ├── normalized-job-detail.scss
    │       └── normalized-job-detail.spec.ts
    └── app.routes.ts

specs/002-normalized-job-details/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── normalized-job-detail.md
```

**Structure Decision**: Keep the feature within the existing single Angular application. The detail page gets its own lazy-loadable page directory, while the shared job model and `TipApi` remain under `src/app/core`. The existing normalized listing links to the new route and existing API tests are extended with focused detail-operation coverage.

## Complexity Tracking

No constitution violations or additional architectural complexity require justification.
