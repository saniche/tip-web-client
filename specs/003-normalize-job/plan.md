# Implementation Plan: Normalize Job Submission

**Branch**: `003-normalize-job` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-normalize-job/spec.md`

## Summary

Add a lazy-loaded Normalize Job page (`/normalize-job`) that submits a URL and JSON-stringified content to `POST /jobs/normalize`, then tracks the asynchronous result by polling `GET /processing-jobs/{processing_job_id}` until a terminal state. Per the user directive, state is managed with a **hybrid signals + RxJS** approach on Angular 22.1.8: a root-provided `@ngrx/signals` store holds submissions (surviving route changes), while RxJS `timer`/`switchMap` streams drive per-submission polling with completion on terminal status. In-flight submissions persist to `localStorage` so polling resumes after a browser reload. The dashboard gains a normalize link, the normalization jobs list, and a computed in-progress count; the normalized-jobs listing gains a normalize link.

## Technical Context

**Language/Version**: TypeScript 6.0 with Angular 22.1.8 standalone components

**Primary Dependencies**: Angular Router, HttpClient, Reactive Forms, RxJS 7.8, `@ngrx/signals` 22.0.1 (hybrid signals + RxJS state per user directive), Bootstrap 5.3

**Storage**: No server-side storage changes; in-flight submission records persisted client-side in `localStorage` (convention from `local-auth-store.ts`)

**Testing**: Vitest through Angular's test builder, Angular HTTP testing utilities

**Target Platform**: Browser-based Angular application

**Project Type**: Web application frontend

**Performance Goals**: Spinner visible within ~1s of submission (SC-001); default poll interval 2s with `switchMap` to prevent overlapping polls; at least 5 concurrent submissions tracked independently (SC-003)

**Constraints**: Polling must continue across route navigation (root store) and resume after browser reload (localStorage restore); no polling when `processing_job_id` is null; content MUST be sent as a `JSON.stringify`ed string; no zombie polls after terminal states

**Scale/Scope**: One new lazy page + route, one signal store, two new `TipApi` methods, one model file, link/count additions to dashboard and normalized-jobs listing, focused unit/component tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) contains only unfilled template placeholders and therefore defines no enforceable project principles or gates. No violations or exceptions are identified.

**Post-Phase-1 re-check**: The design (signal store + RxJS polling + lazy page, all within the existing single-app structure) introduces no new projects or patterns beyond established conventions. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-normalize-job/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── normalize-job.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── app/
    ├── core/
    │   ├── api/
    │   │   └── tip-api.ts                  # + normalizeJob(), getProcessingJob()
    │   ├── models/
    │   │   └── normalization.ts            # NEW: request/response/submission types
    │   └── state/
    │       └── normalization-store.ts      # NEW: @ngrx/signals store + RxJS polling
    ├── pages/
    │   ├── normalize-job/                  # NEW lazy page
    │   │   ├── normalize-job.ts
    │   │   ├── normalize-job.html
    │   │   ├── normalize-job.scss
    │   │   └── normalize-job.spec.ts
    │   ├── dashboard/                      # + normalize link, jobs list, in-progress count
    │   └── normalized-jobs/                # + normalize link
    └── app.routes.ts                       # + /normalize-job lazy route
```

**Structure Decision**: Keep the feature within the existing single Angular application, following the conventions established in features 001/002: shared models and API client under `src/app/core`, one lazy-loadable page directory per feature under `src/app/pages`. The signal store lives in `src/app/core/state` alongside `app-store.ts` and `auth-store.ts`.

## Complexity Tracking

No constitution violations or additional architectural complexity require justification.
