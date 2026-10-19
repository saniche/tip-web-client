# Research: Normalize Job Submission

**Date**: 2026-10-17 | **Feature**: `003-normalize-job`

All unknowns from the Technical Context are resolved below. The user directive fixes the stack: **Angular 22.1.8 with hybrid state management (signals + RxJS)**.

## R1 — State management approach (hybrid signals + RxJS)

**Decision**: Use an `@ngrx/signals` signal store (`NormalizationStore`, provided in root) to hold the list of normalization submissions and their UI state; use RxJS streams inside the store's methods for the async work (HTTP submit + polling loop).

**Rationale**:
- `@ngrx/signals` 22.0.1 is already a project dependency and matches the existing `AppStore`/`AuthStore` signal-based convention in `src/app/core/state/`.
- Root-provided signal state survives route changes for free, satisfying "user may leave the page at any time" without resolvers or component-level hacks.
- RxJS is the natural fit for the polling loop (timer + switchMap + terminal-condition operators) and composes cleanly with `HttpClient`, which already returns Observables.
- Angular templates bind directly to signals (existing pages do this via `protected readonly` signal accessors), so the spinner/counts update without manual change-detection code.

**Alternatives considered**:
- Pure RxJS `BehaviorSubject` service: works, but loses the ergonomic computed signals the codebase already uses for dashboard metrics.
- Component-local state: fails the "leave the page at any time" requirement without extra plumbing.
- Full NgRx (actions/reducers/effects): unjustified complexity for one feature; `@ngrx/signals` gives the needed structure at a fraction of the boilerplate.

## R2 — Polling strategy for `GET /processing-jobs/{processing_job_id}`

**Decision**: One RxJS polling stream per in-flight submission, managed by the store: `timer(0, POLL_INTERVAL).pipe(switchMap(id => api.getProcessingJob(id)), takeUntil(terminal$))`, where the stream completes when the status is `completed` or `failed` (or the submission is dismissed). Default interval: 2 seconds, matching "standard client-side conventions" from the spec assumptions.

**Rationale**:
- `timer` + `switchMap` prevents overlapping requests if a poll is slow.
- Completing the stream on terminal status guarantees spinners stop exactly once per submission and no zombie polls accumulate.
- Because streams live in the root store (not a component), navigation away does not cancel polling; Angular's dependency-injection lifecycle keeps the store alive for the app session.

**Alternatives considered**:
- `interval` + `mergeMap`: allows overlapping polls; rejected.
- `poll`/custom recursive `delay` chains: harder to cancel and reason about than `takeUntil`.
- Server-sent events / WebSockets: not offered by the server contract; polling is specified.

## R3 — Continuity after leaving the page or reloading the browser

**Decision**: Two-level continuity:
1. **In-session (route change)**: the root-provided `NormalizationStore` keeps polling; the dashboard reads the same store for the list and in-progress count.
2. **Cross-session (browser reload)**: persist a minimal record of in-flight submissions (`{ id, processingJobId, url, submittedAt }`) to `localStorage` (consistent with the existing `local-auth-store.ts` convention). On store init, restore records and resume polling via `GET /processing-jobs/{id}`.

**Rationale**: The server contract provides no "list my processing jobs" endpoint, so the client is the only place that knows which `processing_job_id`s to poll after a reload. `localStorage` is the established persistence mechanism in this codebase for session-adjacent data.

**Alternatives considered**:
- Server-side listing only: the given contract has no such endpoint; depending on an unlisted endpoint would block the feature.
- Session-only tracking (no persistence): fails the spec's "return later" acceptance scenario after a browser restart.

## R4 — In-progress count on the dashboard

**Decision**: Compute the count from the `NormalizationStore` as a `computed()` signal: submissions whose latest status is `pending` or `processing`.

**Rationale**: The store already tracks every submission the user made (including restored ones), so the count is always accurate within one poll interval, requires no additional endpoint, and updates the dashboard instantly via signal reactivity.

**Alternatives considered**:
- Extending `GET /jobs/normalized` with a status filter: the normalized-jobs list model has no per-item status field today, and assuming an unconfirmed server change risks blocking; the client-side count satisfies the spec measurably (SC-005). If the server later exposes such a filter, the store can reconcile with it without changing the UI contract.

## R5 — Submitting content safely (`content` field)

**Decision**: The page collects the job posting URL and raw content; before sending, the raw content object/string is serialized with `JSON.stringify(...)` exactly as the endpoint contract requires, so server-side parsing errors are avoided.

**Rationale**: Directly mandated by the provided API contract. Validation is limited to non-empty URL and content (FR-013); deeper validation is the server's responsibility.

**Alternatives considered**: Sending structured JSON directly — rejected; the contract explicitly defines `content` as a string.

## R6 — Page placement and linking

**Decision**: New lazy-loaded route `/normalize-job` with a standalone page under `src/app/pages/normalize-job/`. Add a link/action from the dashboard and from the normalized-jobs listing page.

**Rationale**: Follows the existing routing pattern (`normalized-jobs` routes use `loadComponent`), keeps the feature bundle isolated, and satisfies FR-009/FR-010 with minimal edits to existing pages.

**Alternatives considered**: Eager import like `Dashboard`/`Jobs` — inconsistent with the newer lazy pattern introduced in feature 001/002.

## R7 — Where completed normalizations lead

**Decision**: On completion, show a success state with a link to the existing normalized job detail route (`/normalized-jobs/{id}`), using the job `id` from the submit response (or `result_id` from the final poll when present).

**Rationale**: Feature 002 already built the detail page; reusing it satisfies "surface the resulting normalized job" with zero duplication.

**Alternatives considered**: Rendering normalized content inline on the normalize page — duplicates detail-page behavior.
