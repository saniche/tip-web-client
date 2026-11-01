# Navigation UI and Route Contract

## Primary navigation

- Order: Dashboard, My Profile, Jobs, Job Matching, Applications, Tailoring, Settings. Hidden areas are omitted without reordering the remainder.
- Available areas have a labeled primary control, an accessible name and at least one reachable destination. Settings is hidden until supported settings exist. Tailoring provides links to its existing session and history, subject to the existing authentication guard.
- Exactly one business area is active on every owned destination; auth and registration have none. Query parameters do not change ownership. Only the exact current page link receives `aria-current=\"page\"`.
- Primary ownership is unique; contextual cross-area links remain valid and do not create another primary home.
- Desktop and narrow layouts expose the same destinations from one navigation tree. Disclosures are keyboard operable, describe their expanded state, support Escape and return focus to their trigger. A successful mobile selection closes the menu.

## Route compatibility

The exhaustive destination/guard matrix in [plan.md](../plan.md) is normative. Preserve route ordering, existing redirects, lazy-loading, source metadata and parameters; apply the specified guard policy.

- Unauthenticated guarded requests redirect to `/auth?returnUrl=...` with the original requested URL. Dashboard, the normalized job listing, sign-in and registration remain public. The existing login flow does not automatically consume `returnUrl`. Signing out leaves protected content and returns to Dashboard.
- `/tailoring-session?jobId=...` and `?reportId=...` retain source context; legacy `/tailored-cvs/new/job/:id` and `/tailored-cvs/new/report/:id` preserve IDs and `data.source`.
- Details, creations and previews provide the correct parent return destination; a document preview returns to its specific request. Existing feature-specific error and empty states remain unchanged.
- `/` and unknown paths retain their existing Dashboard redirects. No feature route redirects are required for this change.

## Titles and page context

Use meaningful route document titles without replacing entity-specific page headings. Detail, creation and preview pages expose a correct existing back link or breadcrumb; breadcrumbs must never imply nonexistent area landing pages.
