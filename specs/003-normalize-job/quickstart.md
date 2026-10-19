# Quickstart: Normalize Job Submission

**Feature**: `003-normalize-job` | **Date**: 2026-10-17

Validation guide proving the feature end-to-end. Contract details live in [contracts/normalize-job.md](./contracts/normalize-job.md); entity and state definitions live in [data-model.md](./data-model.md).

## Prerequisites

- Node/npm per `package.json` (`npm@11.19.0`); run `npm ci` if `node_modules` is missing.
- Backend reachable at the URL configured in `src/environments/environment.ts` (serving `POST /jobs/normalize` and `GET /processing-jobs/{id}`).
- A valid user session (log in via the existing `/auth` flow).

## Run

```powershell
npm start        # dev server (development configuration)
npm test         # Vitest unit/component tests via the Angular test builder
npm run build    # production build sanity check
```

## Validation Scenarios

### VS1 — Submit and complete (P1)

1. Navigate to Dashboard → select **Normalize job** → land on `/normalize-job`.
2. Enter a URL and job content; submit.
3. **Expect**: spinner appears within ~1s; when the server reports `completed`, the spinner disappears and a success state links to `/normalized-jobs/{id}` showing the normalized detail.

### VS2 — Failure feedback (P1)

1. Submit content the server will fail (or force a `failed` poll response).
2. **Expect**: spinner hides and a clear error message is shown; the submission remains listed as failed.

### VS3 — Concurrent submissions (P2)

1. Submit three requests in quick succession without waiting.
2. **Expect**: three independent spinners/statuses; each resolves (completed or failed) on its own without affecting the others.

### VS4 — Leave and return (P3)

1. Start a normalization, then navigate to another page mid-processing.
2. Return via Dashboard → the normalization jobs list.
3. **Expect**: the job appears with its current status; the dashboard in-progress count matches the number of unfinished tasks; selecting a completed job opens its detail view.

### VS5 — Reload continuity (P3)

1. Start a normalization, then reload the browser before it finishes.
2. **Expect**: after reload, the submission reappears (restored from local persistence), polling resumes, and the final outcome is shown without resubmitting.

### VS6 — Input validation (P1)

1. Attempt to submit with an empty URL and/or empty content.
2. **Expect**: submission is blocked and the user is told which field to correct; no HTTP request is sent.

### VS7 — Entry points (P3)

1. From `/normalized-jobs`, select **Normalize job**.
2. **Expect**: navigation to `/normalize-job`. The dashboard link behaves identically.

## Test Coverage Expectations

- `tip-api` specs extended for `normalizeJob` and `getProcessingJob` (request shape, response mapping).
- `NormalizationStore` specs: submit → polling lifecycle, terminal-state transitions, concurrent submissions, persistence restore, in-progress count.
- Page spec: spinner visibility, error display, validation gating, success link rendering.
- Dashboard spec: normalize link and in-progress count rendering.
