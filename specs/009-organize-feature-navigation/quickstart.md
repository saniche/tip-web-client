# Quickstart: Navigation Validation

## Prerequisites

- Existing project dependencies installed and a supported Node/npm environment.
- An approved local or test API with a signed-in test user, profile, normalized jobs, matching report, application, tailoring request and completed CV/cover-letter output fixtures for service-backed checks.
- A desktop browser with responsive viewport controls; no browser E2E framework is currently configured.
- The target deployment must serve the existing deep-link fallback on refresh. Do not use real private user data as test fixtures.

## Commands

Run from the repository root in PowerShell:

```powershell
npm test -- --watch=false --include 'src/app/pages/tailored-cvs/**/*.spec.ts'
npm test -- --watch=false
npm run build
npm start
```

After implementation, run focused shell, route and guard test files using `npm test -- --watch=false --include '<test path>'`, then the full suite and build. Open the local address reported by `npm start`; stop the server when finished.

## Baseline and blockers observed during planning

- The current worktree already guards profile, pipeline, normalization, and job-detail routes, returns to Dashboard on logout, and clears stale session state on rehydration. Dashboard, the normalized-job listing, sign-in, and registration remain public.
- On 2026-11-01 the production build passed with a 628.94 kB initial bundle, exceeding the 600 kB warning budget. The focused route, shell, guard, and session tests passed using a temporary isolated test configuration; the standard test configuration remained blocked by the fixture failures below.
- The setup baseline was rerun on 2026-11-01 with `npm test -- --watch=false --ts-config tsconfig.nav-verification-5f5d002b.json --include src/app/app.routes.spec.ts --include src/app/app.spec.ts --include src/app/core/guards/auth.guard.spec.ts --include src/app/core/state/local-auth-store.spec.ts`: 4 files and 11 tests passed. The temporary configuration included only these specs and was removed after the run.
- The grouped navigation checkpoint passed on 2026-11-01 using the isolated test configuration with navigation, shell and route specs: 7 files and 14 tests passed. Service-backed availability remains unverified.
- The targeted tailoring command above failed before executing tests because the test build compiles other included spec files from `tsconfig.spec.json`: `src/app/core/api/tip-api.spec.ts` uses outdated application request fields; `src/app/pages/application-journal/application-journal-entry.spec.ts` and `application-journal.spec.ts` use outdated `recruiterName` fields; and `src/app/pages/normalized-job-detail/normalized-job-detail.spec.ts` lacks required `isApplied`. This is a pre-existing, out-of-scope test fixture problem; resolve separately or use an approved isolated test configuration before treating tests as passed.
- The configured local API at `http://localhost:8000` was unreachable during planning. Source inspection confirms existing tailoring pages, but not live end-to-end availability. Do not treat either a source inspection or a failed local connection as proof of deployed capability.
- During implementation the local API responded, but an anonymous request to `/api/v1/jobs/normalized?page=1&limit=1` returned HTTP 401. The public listing route opens, but anonymous listing data cannot currently be verified. The browser at `127.0.0.1:4217` also encountered a CORS error; the client-only navigation change cannot establish public backend access.
- Tailoring navigation is enabled for the existing session and history pages. Service-backed verification still requires an approved authenticated test user and fixtures; missing fixtures do not disable navigation.
- Browser checks at 320px and 1280px found no horizontal overflow after removing the global minimum width. At 320px, Enter opened the menu, Space opened Jobs, and Escape returned focus first to Jobs and then to Menu. A signed-out direct job-detail request redirected to sign-in with its return URL.
- Final focused validation used the isolated test configuration with navigation, shell, route, guard, and session specs: 15 files and 28 tests passed. `npm run build` passed with a 637.53 kB initial bundle, above the 600 kB warning budget. `npm test -- --watch=false` failed to compile because of the same pre-existing application-journal and normalized-job fixture errors listed above.
- Real-service tailoring and completed document checks, authenticated end-to-end flows, and the five-person usability exercise remain blocked by missing approved fixtures or participants. Anonymous listing data remains blocked by the local API's HTTP 401 response.

## Acceptance walkthrough

1. At desktop and 320px viewport widths, use mouse and keyboard to open each visible area and its destinations; verify labels, focus, disclosure state, Escape behavior and no navigation-caused page overflow. Settings is hidden. Compare area ownership with [the route matrix](./plan.md#route-mapping-and-compatibility).
2. Visit every route in the matrix directly, then use browser back/forward and refresh on representative details. Confirm active area, document title and appropriate parent path; verify `/` and unknown addresses return to Dashboard.
3. Open each protected route signed out, confirming sign-in and the complete return URL; repeat signed in. Verify only Dashboard and the normalized job listing remain public feature pages, and that sign-in and registration remain public. Sign out from a protected page and confirm Dashboard is shown. Expire or remove the stored session and confirm protected navigation redirects to sign-in. The existing login page does not automatically consume `returnUrl`.
4. Open a normalized job and matching report and use their tailoring actions. Confirm job/report launch context, legacy source-specific addresses and query parameters survive, and Tailoring owns the resulting pages.
5. Open Tailoring from navigation and follow both session and history links. With valid service-backed fixtures, inspect request details, preview and download completed CVs and cover letters. Record service verification separately; if it is blocked, do not claim end-to-end readiness.
6. Verify Workflow pipeline remains at `/jobs` and is distinguished from the application journal. Use existing data and avoid altering business workflows.
7. Conduct the spec's usability exercise with at least five representative users, record first-attempt success for each named task, and check all measurable criteria in [spec.md](./spec.md).
