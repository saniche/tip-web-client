# Research: Matching Sessions and Reports

**Feature**: [Matching Sessions and Reports](./spec.md)

## Repository Findings and Decisions

### 1. Application architecture and integration point

**Decision**: Implement inside the existing Angular single-page application, using its standalone components, router, `TipApi`, Angular signals/NgRx Signals, and RxJS conventions.

**Rationale**: The project uses Angular 22, has a single route table in `src/app/app.routes.ts`, and has page-specific standalone components. `TipApi` centralizes HTTP operations and the application config installs its HTTP client and auth interceptor. The interest and normalized-job pages already provide independently testable patterns for paginated data, errors, retry, empty states, and navigation.

**Alternatives considered**: A separate application or a second API client would duplicate existing routing, authentication, and service behavior without a feature need.

### 2. Matching and report API contract availability

**Decision**: Use the feature-brief matching/report API descriptions as the user-approved provisional frontend contract. The backend schema is unavailable; validate runtime shapes and preserve visible errors rather than adding backend behavior or inventing omitted semantics.

**Rationale**: The workspace has no backend source, and `TipApi` currently has no matching submission, report-list, report-detail, or report-delete methods. The repository search found no matching/report DTOs or schemas. Exact report-list envelope, report/scoring status values, response nullability, and some job/profile semantics are explicitly left for inspection in the feature brief.

**Implementation limits**: Report listing accepts only the provisionally assumed direct array. Unknown process/report/scoring statuses remain raw. Report deletion is unavailable until report terminal values are verified.

### 3. Matching process status handling

**Decision**: Use a matching-specific response model and status parser that preserves unknown status values. Do not broaden or reuse the normalization mapper to interpret matching status.

**Rationale**: `src/app/core/models/normalization.ts` defines a normalization-oriented status union (`pending`, `processing`, `completed`, `done`, `failed`). Its `normalizeProcessingStatus` maps every unrecognized value to `pending`. The matching feature requires `pending`, `running`, `done`, and `failed`, and requires unknown values to remain unrecognized. The existing `TipApi.getProcessingJob` is used by `NormalizationStore`; changing its fallback could regress normalization behavior.

**Alternatives considered**: Reusing the mapped processing status would incorrectly present an unknown matching response as pending and could change normalization semantics if the mapper were modified.

### 4. Session state persistence and polling lifecycle

**Decision**: Persist only the resumable matching-session snapshot in `sessionStorage`, and coordinate one active session/poll loop through a root-provided matching store. Stop polling when leaving the session workflow and resume from the saved process identifier on return.

**Rationale**: This follows the feature requirement for transient state and reload recovery. The existing `NormalizationStore` uses an NgRx signal store, RxJS timers, per-submission poll-stop controls, and `localStorage`, but that store persists normalization history and has a separate lifecycle. Matching session storage must be cleared on discard or close. Its process poller must not overlap requests or treat network errors as terminal.

**Alternatives considered**: Reusing normalization submissions would conflate distinct workflows and inherit its status fallback and localStorage retention behavior. Keeping the entire workflow only in a page component would not survive navigation/reload.

### 5. Interest synchronization

**Decision**: Reuse `TipApi.listInterests` and `TipApi.addInterest`; synchronize only on explicit confirmation, refresh after the add phase, and rely on verified backend behavior before treating duplicate/add errors as success.

**Rationale**: The existing client exposes paginated interest listing and a per-job add operation returning `Observable<void>`. Job-interest entries contain the normalized job object. The API signature alone does not establish duplicate-add semantics, stale-state behavior, or whether multiple independent additions may proceed after one failure.

**Alternatives considered**: Adding jobs while they are selected or assuming the matching endpoint adds interests would violate the specified interaction and could cause unexpected backend side effects.

### 6. Built-profile determination

**Decision**: Use existing profile retrieval to gate a missing/unavailable profile and provide a profile-page link. The frontend has no built/readiness field; a successful profile read is not claimed to prove matching readiness, which remains backend-authoritative at submission.

**Rationale**: `TipApi.getProfile` returns `UserProfile` with `id`, `user_id`, `data`, and `output_language`; the frontend has no explicit `isBuilt` flag or matching-readiness model. The profile page uses a null profile as not yet loaded/missing, which is not sufficient evidence by itself to establish server-side matching readiness.

**Implementation limit**: Do not infer profile readiness from non-empty profile data.

### 7. Job metadata for session and report results

**Decision**: Use available job snapshots for selection. On an opened report only, enrich job IDs through the existing single-job detail operation; history listing does not fan out to report or job detail calls.

**Rationale**: Normalized job summaries include ID, title, company, location, posting date, and source. `TipApi.getNormalizedJob` retrieves one detail by identifier. `JobInterest` embeds a `NormalizedJob`. No batch-detail API is exposed by this frontend.

**Alternatives considered**: Inventing a bulk endpoint or loading report details while building the review notices is prohibited. Missing report job metadata should use the specified job-ID fallback.

### 8. UI, accessibility, and test conventions

**Decision**: Follow existing Bootstrap 5.3 and page-local SCSS patterns, use labeled loading/error/empty states, and test APIs, store transitions, and components with Angular `TestBed`, HTTP testing utilities, and Vitest.

**Rationale**: Existing listing pages use Bootstrap form/table classes, `role=status`/`role=alert`, retry actions, route query parameters, Angular signals, `DestroyRef`, and `takeUntilDestroyed`. API tests use `provideHttpClientTesting` and assert request URLs, methods, parameters, and response mapping. The configured `npm test` script invokes Angular's unit-test builder, with Vitest installed.

**Alternatives considered**: Introducing a new UI or test framework is unnecessary and would create dependency and convention drift.

## Contract Verification Outcomes

The local repository confirms the existing frontend shape, not backend semantics. The user directed implementation to proceed from the feature brief as a provisional model. [contracts/matching-api.md](./contracts/matching-api.md) records the user-approved assumptions and remaining unknowns. No response fields or status values are inferred beyond that model; report deletion remains disabled until terminal semantics are known.
