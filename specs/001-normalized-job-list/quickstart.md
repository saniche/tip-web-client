# Quickstart: Normalized Job Listing

## Prerequisites

- Node.js and npm versions supported by this repository.
- Dependencies installed with `npm install`.
- A reachable jobs service configured through the application's active environment.
- The service's paginated response envelope confirmed as described in [contracts/normalized-jobs.md](./contracts/normalized-jobs.md).

## Automated Validation

From the repository root:

```powershell
npm test
npm run build
```

Expected results:

- Unit tests pass, including API request serialization, query-driven listing states, filtering, pagination, empty results, invalid pagination, retry, and stale-response protection.
- The production Angular build completes without type or template errors.

## Manual End-to-End Scenarios

1. Start the application with `npm start` and open `/normalized-jobs`.
2. Confirm the initial request uses page `1` and limit `20`; confirm the result rows contain identifier, title, company, location, posting date, and source in newest-first order.
3. Enter a title, company, location, or source filter. Confirm the URL and service request reflect the selected filters and the page resets to `1`.
4. Apply multiple filters and confirm each displayed result matches every selected filter.
5. Change page and limit, then use browser back/forward or refresh. Confirm the URL restores the same filter and pagination state.
6. Search for a value with no matches. Confirm the empty state appears and filters can be revised or cleared.
7. Submit invalid page or limit values. Confirm a validation message appears and offers a correction.
8. Make the service unavailable, trigger a request, and retry after restoring it. Confirm the error and retry states are clear and the current query is retried.
