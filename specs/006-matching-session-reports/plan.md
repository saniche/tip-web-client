# Implementation Plan: Matching Sessions and Reports

**Branch**: `006-matching-session-reports` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-matching-session-reports/spec.md`

## Summary

Add a frontend-only matching workflow to the existing Angular application. Reuse its standalone route/page conventions, `TipApi`, normalized-job and interest models, profile retrieval, authentication, Bootstrap styles, signal-based state, and Vitest tests. Keep one matching session in transient browser storage, synchronize interests only on confirmation, track one process per submission, and provide independent report history and detail views. The workspace has no backend source or matching/report schema; per user direction, use only the feature brief's provisional model and document unresolved semantics rather than inventing them.

## Technical Context

**Language/Version**: TypeScript 6.0; Angular 22.1.

**Primary Dependencies**: Angular standalone components and router, Angular signals, `@ngrx/signals` 22, RxJS 7.8, Bootstrap 5.3, Vitest 4. No new dependency is currently justified.

**Storage**: Existing backend remains authoritative for jobs, interests, profiles, submissions, processing, and reports. Use `sessionStorage` only for the resumable matching-session snapshot required by the spec. Do not persist report bodies or create a backend/session entity.

**Testing**: `npm test` through the Angular unit-test builder with Vitest, Angular `TestBed`, and `HttpTestingController`; run `npm run build` for a production build check. Use existing component/API/store test patterns.

**Target Platform**: Authenticated browser-based Angular single-page application.

**Project Type**: Frontend web application.

**Performance Goals**: No additional numeric latency target is specified. Preserve the existing responsive loading, empty, and error feedback patterns; use a controlled process polling interval and do not overlap status requests.

**Constraints**: No backend source or OpenAPI schema is present in this workspace. Per the user's direction, use the feature brief as a provisional integration model and explicitly document its missing details; do not infer unprovided fields or status values. Surface contract/runtime mismatches as errors. Preserve unknown matching statuses; do not reuse the normalization status mapper's unknown-to-`pending` fallback. Do not change job normalization or add backend capabilities.

**Scale/Scope**: Three user journeys: session assembly/submission, process tracking/recovery, and report history/details/deletion. One active session and one process per confirmation; no automatic batch splitting or cross-report ranking.

## Constitution Check

The repository's `.specify/memory/constitution.md` still contains template placeholders and no ratified project principles or governance rules. There are therefore no constitutional gates to apply. The feature-level gates are:

| Gate                                          | Result                      | Evidence / action                                                                                                                                                                               |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope remains frontend-only                   | PASS                        | No backend endpoints or models are to be added.                                                                                                                                                 |
| Existing job normalization remains unchanged  | PASS                        | Session selection is separate from normalization submissions and state.                                                                                                                         |
| Existing behavior is reused where supported   | PASS, provisionally modeled | `TipApi` already covers normalized jobs, interests, profile retrieval, and generic processing lookup. Matching/report methods use the user-approved brief and surface runtime shape mismatches. |
| State and retry behavior avoid duplicate work | PASS by design              | Persist the active selection and process identifiers; only retry after explicit review and confirmation.                                                                                        |
| Tests follow repository conventions           | PASS                        | Angular `TestBed`, HTTP testing, Vitest, and component/store specifications are already used.                                                                                                   |

No gate violation requires a complexity exception. The user-approved provisional contract is an explicit limitation, not permission to invent omitted fields or semantics.

## Project Structure

### Documentation (this feature)

```text
specs/006-matching-session-reports/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── matching-api.md
└── tasks.md                 # Generated by /speckit-tasks
```

### Source Code (repository root)

```text
src/app/
├── app.routes.ts
├── core/
│   ├── api/
│   │   └── tip-api.ts                    # Matching operations follow the provisional brief model
│   ├── models/
│   │   └── matching.ts                   # Matching/session/report DTOs and status parsing
│   └── state/
│       └── matching-store.ts             # Single active-session lifecycle and polling
└── pages/
    ├── matching-session/                 # Review, submit, progress, summary, retry
    └── matching-reports/                 # History and report detail
```

Existing `normalized-jobs` and `interests` pages will gain session entry actions that pass a normalized selected-job snapshot to the shared session workflow. The above feature files are candidate locations, not a requirement to introduce a separate abstraction where an existing page/store pattern is simpler.

**Structure Decision**: Extend the existing single Angular application under `src/app`. Use the existing route table and authentication guard conventions for new workflow/history routes, an Angular signal-based store for the one active session, and the existing `TipApi` rather than a second HTTP client. Keep report-history state separate from active-session persistence.

## Contract Assumptions and Implementation Limits

The user directed implementation to proceed with the provided model because backend schemas are unavailable. Use only its explicit fields/statuses and retain visible failures for data that does not match. Specifically:

1. The report-list envelope is unspecified; provisionally accept only a direct array of records with the described fields and show a load error for other shapes.
2. Report/scoring status values and retry classification are unspecified; preserve raw values and do not infer terminal or failure semantics.
3. The batch limit is unspecified; do not invent one or split submissions. Surface backend rejections.
4. Duplicate-interest behavior and built-profile semantics are unspecified; determine membership from existing data where reliable, refresh after adding, and do not classify an error as success unless existing data confirms membership.
5. The frontend exposes only single-job detail retrieval. Do not invent a batch lookup.

6. Profile retrieval is only an availability check; matching readiness remains authoritative to the backend.
7. Report deletion remains unavailable because no report terminal statuses are known.

No backend endpoint, model, response field, status value, or capability may be added to compensate for these unknowns.

## Complexity Tracking

No constitution violations or additional architectural projects are proposed.
