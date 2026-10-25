# Research: Interest Management UI

## Decision 1: Domain Models and Entity Mapping

- **Decision**: Define dedicated interfaces in `src/app/core/models/interest.ts`:
  - `JobInterest`: representing an interest item with interest metadata (`id`, `createdAt`, `userId`) and the associated `job` (conforming to `NormalizedJob` or a job header interface with `id`, `title`, `company`, `location`, `postingDate`, `source`).
  - `JobInterestFilters`: query parameters for `title`, `company`, `location`.
  - `JobInterestQuery`: extends `JobInterestFilters` with `page: number` and `limit: number`.
  - `JobInterestsPage` / `JobInterestsResponse`: paginated container with `{ items: JobInterest[]; limit: number; total: number; page: number }`.
- **Rationale**: Keeps interest models isolated from generic job models while sharing or reusing `NormalizedJob` for the job header values. Matches the exact naming and structural conventions used in `src/app/core/models/normalized-job.ts`.
- **Alternatives considered**:
  - Reusing `NormalizedJob` directly for interests: rejected because an interest represents a relationship entity with its own creation date and identifier, while wrapping a job header.

---

## Decision 2: API Client Integration in TipApi

- **Decision**: Extend `TipApi` (`src/app/core/api/tip-api.ts`) with three dedicated methods:
  1. `listInterests(query?: Partial<JobInterestQuery>): Observable<JobInterestsPage>` → `GET /jobs/interests` with `page`, `limit`, and optional `title`, `company`, `location` as `HttpParams`.
  2. `addInterest(jobId: string): Observable<void>` → `POST /jobs/${encodeURIComponent(jobId)}/interest`.
  3. `removeInterest(jobId: string): Observable<void>` → `DELETE /jobs/${encodeURIComponent(jobId)}/interest`.
- **Rationale**: Aligns with Angular HTTP client practices throughout the app, handles query parameter serialization safely, encodes URI components, and mirrors `TipApi` methods for normalized jobs.
- **Alternatives considered**:
  - Creating a separate `InterestsApi` service: rejected because all platform API endpoints currently live in the unified `TipApi` root service (`/jobs`, `/jobs/normalized`, `/profile`, `/auth`).

---

## Decision 3: Reactive State and Asynchronous Query Flow

- **Decision**: Follow the Signal + RxJS pattern established in `NormalizedJobs` (`src/app/pages/normalized-jobs/normalized-jobs.ts`):
  - Read query parameters (`page`, `limit`, `title`, `company`, `location`) from `ActivatedRoute.queryParamMap`.
  - Use `switchMap` from `ActivatedRoute.queryParamMap` to cancel in-flight stale requests on navigation or filter changes.
  - Apply 300 ms debounce on text filter inputs before updating the URL query parameters (or trigger via form submission / debounced input signals).
  - Manage UI state via Angular `signal<ListingState>('loading' | 'results' | 'empty' | 'error')`.
  - Maintain optimistic / active pending states for interest removal, preventing duplicate requests.
- **Rationale**: URL query parameters represent the single source of truth for shareable, bookmarkable, and browser-navigable search & pagination state. `switchMap` natively guarantees that stale responses are discarded.
- **Alternatives considered**:
  - Storing filter and pagination state solely in component internal memory: rejected because users would lose their filters on reload or navigation back from job details.

---

## Decision 4: Removal Confirmation and Page Boundary Transitions

- **Decision**:
  - In the interests list, clicking "Remove" exposes an inline confirmation dialog or button toggle (e.g., `removingId: signal<string | null>`, with "Confirm" and "Cancel") on the row/card before dispatching `DELETE /jobs/{jobId}/interest`.
  - While deletion is in flight, disable the row's actions and show a spinner/loading indicator.
  - If the deleted item was the only item on page `N` (where `N > 1`), automatically navigate to page `N - 1`. Otherwise, refresh the current page query.
- **Rationale**: Satisfies FR-016, FR-018, FR-019, FR-020, and the clarification decision requiring confirmation without disruptive page-wide layout flashes.
- **Alternatives considered**:
  - Browser-native `window.confirm()`: rejected as inconsistent with Bootstrap design system and poor UX on mobile.

---

## Decision 5: Job Detail Page Interest Toggle

- **Decision**:
  - In `NormalizedJobDetail` (`src/app/pages/normalized-job-detail/normalized-job-detail.ts`):
  - Add an interest action button in the header actions block (`header .normalized-job-detail__actions`).
  - Introduce an `isInterested` signal (or state) and an `interestLoading` signal.
  - When the user clicks the interest button, dispatch either `addInterest(jobId)` or `removeInterest(jobId)`, updating the local signal upon successful response and showing inline error messaging if the call fails.
- **Rationale**: Fulfills the clarification decision stating that the job detail view must provide an interest toggle button that updates state on interaction.
- **Alternatives considered**:
  - Only allowing interests to be managed from the list: rejected based on explicit user requirement to manage interests from job details.
