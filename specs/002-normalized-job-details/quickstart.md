# Quickstart: Normalized Job Details

## Prerequisites

- Node.js and npm compatible with the repository's `packageManager`.
- Dependencies installed with `npm install`.
- A running API configured through the existing environment files.
- An authenticated user and at least one normalized job.

## Automated validation

Run the focused test suite:

```powershell
npm test -- --run src/app/pages/normalized-job-detail/normalized-job-detail.spec.ts src/app/core/api/tip-api.spec.ts
```

Expected outcome: detail loading, route ID handling, field rendering, source-link behavior, permission-gated controls, update success/failure, deletion confirmation, and API request shapes pass.

Run the production build:

```powershell
npm run build
```

Expected outcome: the application builds without TypeScript or template errors.

## Manual scenarios

1. Open `/normalized-jobs`, select a job, and confirm navigation to `/normalized-jobs/{id}`.
2. Confirm the detail page displays all available values, status, lists, and a return path.
3. For a non-email source with a URL, activate the source link and confirm it targets the source. For an email source, confirm the URL has no clickable affordance.
4. Load a job with `has_write_access: false` and confirm no usable edit or delete controls are present.
5. Load a job with `has_write_access: true`, edit company, location, salary, and source, save, and confirm the returned values are displayed.
6. Force an update failure and confirm the error is visible and entered values remain available for retry.
7. Request deletion, cancel once, then confirm deletion and verify return to the listing.
8. Force a detail load or deletion failure and confirm the page does not show a false success state.

The API shapes and editable-field boundary are documented in [contracts/normalized-job-detail.md](./contracts/normalized-job-detail.md), and field/state rules are documented in [data-model.md](./data-model.md).
