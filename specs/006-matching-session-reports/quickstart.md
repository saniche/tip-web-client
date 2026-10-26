# Quickstart: Matching Sessions and Reports

This guide validates the matching-session feature after implementation. It does not replace the contract verification required by [matching-api.md](./contracts/matching-api.md).

## Prerequisites

- Node.js and the repository's npm version as specified by `package.json` (`npm@11.19.0`).
- Dependencies installed with `npm ci` if `node_modules` is absent.
- The application configured to use an environment with the existing authentication, job, profile, interest, matching, processing, and report services.
- A test account with a built profile, normalized jobs, and interest data.
- A backend environment is available to verify the provisional matching API, process statuses, report metadata, interest synchronization, profile readiness, and report deletion before production use.

## Automated Validation

From the repository root:

```powershell
npm test -- --watch=false
npm run build
```

Expected outcomes after unrelated pre-existing project errors are resolved:

- The Angular/Vitest suite passes, including matching-store lifecycle and persistence tests, interest/submission ordering tests, process polling/recovery tests, report DTO/rendering tests, and existing regression tests.
- The production build completes without type or template errors.

Use the focused test selector supported by the configured Angular test builder when iterating on an individual matching test file; the final validation should include all relevant existing and new tests.

## Validation Results for This Implementation

- `npm test -- --watch=false`: **blocked before test execution** by pre-existing compile errors in the application-journal fixtures/template (`recruiterInfo`, `recruiterName`, and `recruiterEmail`) and a normalized-job-detail fixture missing `isApplied`. No matching-feature diagnostic was reported by the focused Angular compile attempts.
- Focused Angular test selection for the matching store and session specs: **blocked before test execution** by unrelated project-wide TypeScript/template errors. The new T028 test files produced no diagnostics after implementation.
- `npx tsc --noEmit -p tsconfig.app.json`: **passed** after the T028 changes. `npx prettier --check` on the changed model, store, tests, and session template: **passed**.
- `npm run build`: **blocked** by existing references to `ApplicationJournalEntry.recruiterName` and `recruiterEmail` in `src/app/pages/application-journal/application-journal.html`. No matching-feature build error was reported.
- Isolated pure-model tests (`npx vitest run src/app/core/models/matching.spec.ts --environment jsdom`): **passed** (7 tests). Angular component/store specs cannot be run directly with plain Vitest because the Angular test environment is initialized by the configured Angular test builder.
- Manual authenticated end-to-end checks: **not run**. No matching backend schema/account was available; endpoint paths and payload assumptions remain provisional as recorded in [matching-api.md](./contracts/matching-api.md).

## End-to-End Scenarios

1. **Mixed-source selection**: Open Normalized Jobs, add one job to a session, navigate to My Interests, add another, and confirm the same session contains both. Add a duplicate and verify it is represented once. Confirm that selection alone does not change interests or start matching.
2. **Review and interest synchronization**: Review a non-empty selection with both interest states represented. Verify the number of interest additions and profile eligibility. Confirm once; verify required interest additions occur before exactly one matching submission, already-interested jobs are not added again, and refresh updates the interest view. Simulate an individual add failure and verify that job is excluded and explained.
3. **Process lifecycle**: Exercise `pending` and `running`, then separately `done` and `failed`. Confirm polling is process-ID based, serialized, and stops at terminal states. Simulate temporary request failure and an unknown status; verify the last recognized state remains visible, the raw unknown value is preserved separately, a recovery action is available, and no duplicate submission is made.
4. **Reload and navigation**: Reload or leave/return while processing. Confirm the selection, submitted job IDs, processing ID, and known report ID are recovered; only one polling loop resumes. Confirm the session is cleared from transient storage on close or discard.
5. **Report history and details**: Verify the list handles empty and populated responses without detail fan-out. Open a report and check job fallbacks, score/rank ordering, current-format sections, null score presentation, and legacy fallback. Retry a failed report load without resubmitting.
6. **Deletion and retry**: Report deletion remains disabled until report terminal statuses are verified; do not infer them from process statuses. After verification, add confirmation, active-process restrictions, success refresh, and failure retention tests. Retry remains explicit and reviewable. Only jobs known not to have been submitted are currently eligible for retry; submitted jobs are excluded from retry candidates because scoring-status semantics are unverified, and the UI must not claim whether those jobs succeeded or failed.

## Contract Fixture Requirements

- Until backend schemas or observed responses are available, use only the feature brief's explicitly described provisional fields and the documented report-list array assumption. Replace these fixtures with verified server payloads when available.
- Include unknown process statuses, omitted/null identifiers where allowed, empty report histories, empty result arrays, null score/rank, and legacy/unexpected report results.
- Do not assert invented report statuses, scoring statuses, batch limits, or pagination behavior.
