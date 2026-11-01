# Implementation Plan: Client Feature Organization and Navigation

**Branch**: `main` (actual Git branch; setup reported feature identifier `009-organize-feature-navigation`) | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification in [spec.md](./spec.md)

## Summary

Organize the existing standalone client pages under six available business areas, with Settings hidden until it has a working destination. Keep the existing flat addresses, components, lazy-loading choices, and workflow links. Require authentication for every feature route except Dashboard and the normalized job listing, retaining public sign-in and registration. Put the lightweight `/jobs` pipeline under Jobs as **Workflow pipeline**, distinct from **Application journal** under Applications. Existing tailoring pages already exist; expose session and history under Tailoring. Use route metadata to determine area ownership, titles, and parent context rather than inventing new routes or moving business logic.

## Technical Context

**Language/Version**: TypeScript ~6.0.2; Angular 22.1.x standalone components and router.

**Primary Dependencies**: Angular Router, Bootstrap 5.3 SCSS, RxJS, existing Angular signals and NgRx signals. No new navigation or icon dependency.

**Storage**: No new persistence; existing feature stores and APIs remain unchanged.

**Testing**: Angular `@angular/build:unit-test`, Vitest and jsdom; existing component, guard and `RouterTestingHarness` tests. Manual real-browser checks cover viewport and keyboard behavior; no existing E2E framework.

**Target Platform**: Existing web client, desktop and mobile down to 320 CSS pixels.

**Project Type**: Single Angular web client.

**Performance Goals**: No new network requests for navigation, no new startup dependency or state store, and retain existing lazy-loading boundaries.

**Constraints**: Preserve all addresses, route ordering, query parameters, existing authorization and session controls, except for the explicitly requested tighter route access and sign-out redirect; avoid backend changes and empty feature placeholders. See [quickstart.md](./quickstart.md) for baseline limitations and validation.

**Scale/Scope**: Seven conceptual areas, 21 named route patterns plus root and wildcard redirects; navigation, layout and the explicitly requested client access policy.

## Constitution Check

**Pre-research**: PASS with qualification. The constitution file is an unfilled template, not ratified project principles; its example comments are not enforceable gates. Scope, access preservation, minimality, and validation are independently imposed by the specification.

**Post-design**: PASS on the same basis. No backend or feature rewrite is planned; session rehydration is adjusted only to enforce the access policy after expiry or removal in another tab. No constitution exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/009-organize-feature-navigation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── navigation.md
```

### Source Code (repository root)

```text
src/app/
├── app.ts, app.html, app.scss, app.routes.ts, app.spec.ts
├── core/guards/                  # existing authGuard
├── core/state/                   # existing stores; session rehydration enforces expiry
└── pages/                        # existing standalone feature pages
    ├── auth/, dashboard/, jobs/, profile/
    ├── normalize-job/, normalized-jobs/, normalized-job-detail/, interests/
    ├── matching-session/, matching-reports/, application-journal/
    └── tailored-cvs/
```

**Structure Decision**: Retain the existing page folders and lazy imports. There is no shared layout/sidebar directory to reuse: the root `App` is the shared shell. Implement a small typed navigation definition and focused presentational navigation component alongside that shell if needed; retain the root shell's authentication/session and workflow status responsibilities. Do not physically move feature folders merely to mirror business groupings.

## Current vs Proposed Navigation

**Current**: A single wrapping header contains individual links for Dashboard, Normalized jobs, Jobs, Interests, Matching session, Matching reports, Tailoring session, Tailoring history, Application journal, and Profile; login/logout is separate. Normalize job is reached contextually. There is no sidebar, shared breadcrumb component, icon set, or area-level active mapping. `routerLinkActive` alone does not group different paths such as `/normalize-job` and `/normalized-jobs`. The root stylesheet and Bootstrap grids provide wrapping but there is no explicit collapsible navigation.

**Proposed**: Primary areas in this order, with exactly one owner for each destination. A primary entry reveals or links to a labeled group of existing destinations; show contextual links inside pages as secondary workflow links, not duplicate primary ownership. One accessible primary navigation region is used at any viewport.

| Area | Secondary destinations | Default primary destination |
|---|---|---|
| Dashboard | Overview | `/dashboard` |
| My Profile | Profile | `/profile` |
| Jobs | Normalized jobs, Normalize job, Interests, Workflow pipeline | `/normalized-jobs` |
| Job Matching | Matching session, Matching reports | `/matching-session` |
| Applications | Application journal, Add application | `/applications` |
| Tailoring | Tailoring session, Tailoring history | `/tailoring-session` |
| Settings | None | Hidden; no placeholder or route |

Use consistent labeled inline SVG icons or existing local assets, decorative to assistive technology; do not rely on icons alone or introduce an icon library. Tailoring is not an invented feature: session, history, request details and document preview/download controls are present in the client. Enable Tailoring navigation to its existing session and history destinations. Preserve authentication and contextual links; a temporary outage, signed-out state, empty history, or pending service verification must not hide or disable the navigation. Service-backed verification remains a release check.

## Route Mapping and Compatibility

No URL changes or new route redirects are planned; existing `/` and `**` redirects remain. The table records the required guard assignment. All parameter values, query strings, and legacy source data are retained.

| Existing route | Owner / page context | Required `authGuard` |
|---|---|---|
| `/` | Redirect to Dashboard | No |
| `/dashboard` | Dashboard / Overview | No |
| `/auth`, `/auth/register` | Session controls; no active business area | No |
| `/profile` | My Profile / Profile | Yes |
| `/jobs` | Jobs / Workflow pipeline | Yes |
| `/jobs/interests` | Jobs / Interests | Yes |
| `/normalize-job` | Jobs / Normalize job | Yes |
| `/normalized-jobs` | Jobs / Normalized jobs | No |
| `/normalized-jobs/:id` | Jobs / Normalized job detail; parent Normalized jobs | Yes |
| `/matching-session` | Job Matching / Matching session | Yes |
| `/matching-reports` | Job Matching / Matching reports | Yes |
| `/matching-reports/:id` | Job Matching / Report detail; parent Matching reports | Yes |
| `/applications` | Applications / Application journal | Yes |
| `/applications/new` | Applications / Add application; parent Application journal | Yes |
| `/applications/:id` | Applications / Application detail; parent Application journal | Yes |
| `/tailoring-session` | Tailoring / Tailoring session | Yes |
| `/tailored-cvs` | Tailoring / Tailoring history | Yes |
| `/tailored-cvs/new/job/:id`, `/tailored-cvs/new/report/:id` | Tailoring / Tailoring session; preserve `data.source` and ID | Yes |
| `/tailored-cvs/:id` | Tailoring / Tailoring request; parent Tailoring history | Yes |
| `/tailored-cvs/:id/documents/:documentId` | Tailoring / Document preview; parent specific tailoring request | Yes |
| `/**` | Existing wildcard redirect to Dashboard | No |

Keep `/applications/new` before `/applications/:id` and source-specific tailoring routes before parameterized tailoring detail routes. Preserve `jobId` and `reportId` query parameters for `/tailoring-session`, and the existing handling for conflicting launch context. Reuse the guard, which refreshes the session and redirects to `/auth` with the original `returnUrl`. The current sign-in page does not consume `returnUrl` after successful login; recording it does not imply automatic resumption. Signing out navigates to Dashboard so protected content is not left open. Session rehydration clears stale in-memory state when the stored session is missing or expired.

## Layout, State and Interaction Design

1. Define typed area IDs and navigation entries, with stable labels, decorative icons, default destinations and ordered sublinks. Keep the ownership of each route in route metadata next to the route; entries may refer to those route destinations but must not have a second independent URL-prefix ownership algorithm. Keep `data.source` on the two legacy tailoring launch routes.
2. Read the deepest successfully activated route's metadata after completed navigation to determine the one active area, current page label and optional parent. Do not derive ownership from prefix matching: `/jobs` and `/jobs/interests`, the legacy tailoring paths, and distinct normalized/matching paths must resolve correctly. No area is active for auth pages; redirects resolve to their final area. Query parameters do not change ownership. Keep prior state until successful navigation, so a cancelled or rejected navigation does not select an unvisited page.
3. Keep the root shell's brand, login/logout, workflow status and outlet. Extract the primary and secondary navigation as a focused standalone presentational component only; share the same area data at all widths. Primary buttons and secondary links need correct accessible names, visible focus, `aria-expanded`/`aria-controls` for disclosures, and `aria-current=\"page\"` only for the actual current link. Highlight one area visually and expose its expanded/current context accessibly without incorrectly marking a different page as current.
4. At desktop widths show the ordered areas and their available destinations through accessible disclosures; below Bootstrap's `lg` breakpoint, use a labeled menu toggle with the same area structure. No duplicate simultaneous desktop/mobile navigation trees. Opening/closing is keyboard-operable, focus remains visible, Escape closes an open menu/disclosure and returns focus to its trigger, navigation closes the mobile menu, and no navigation-caused page-level horizontal overflow occurs at 320px. Maintain session control access and avoid covering content or trapping focus.
5. Add route titles using existing router title support and concise area/page labels. Preserve existing page `<h1>` content and feature templates wherever possible; do not introduce a second `<h1>`. For detail/creation/preview pages, use existing back links when they already provide the right parent; otherwise add a small shell breadcrumb using route metadata and resolved IDs. Do not construct links to nonexistent area landing pages. Keep entity-specific headings supplied by pages and use safe generic document titles when data has not loaded.
6. Preserve links between jobs, interests, matching reports, profiles, and tailoring, including the dashboard pipeline shortcut. Label the pipeline as a lightweight in-memory workflow, not an application journal or synchronized application list. Changes to feature templates are limited to necessary labels, missing parent navigation, or accessibility.

See [navigation contract](./contracts/navigation.md) and [data model](./data-model.md) for precise invariants.

## Frontend Implementation and Ordered Migration

1. Capture the route, guard, return URL, legacy tailoring launch and shell behavior baseline. Resolve the pre-existing test compilation failures listed in [quickstart.md](./quickstart.md) separately or use an approved isolated test configuration; do not silently alter unrelated tests in this navigation work.
2. Apply the required guard policy, preserving public authentication pages and the two public feature pages. Add route metadata and titles without changing paths, route order, `loadComponent`, existing `data.source`, redirects, or context parameters. Define the typed primary/secondary navigation entries with Settings hidden and existing Tailoring destinations enabled.
3. Refactor shell navigation into the reusable presentational component and render area-level ownership, sublinks, icons, titles and parent context. Preserve auth controls, next-action status, outlet and existing features. Do not move feature folders or change feature stores; the session rehydration change is limited to the required access policy.
4. Implement responsive disclosure behavior and keyboard/focus handling. Verify desktop and 320px navigation using the same DOM/definitions.
5. Add focused unit and real-router navigation tests, then run relevant existing tests and production build. Exercise direct links, guard redirects, back links and tailoring context with representative fixtures.
6. Perform browser and service-backed acceptance including tailoring workflows, and execute the five-person usability exercise from the spec; if prerequisites or baseline compilation are unavailable, record the blocked checks rather than claiming completion.

## Test Strategy

- **Metadata/definition unit tests**: seven conceptual areas in order, Settings hidden, Tailoring availability policy, unique route ownership, area labels/icons, no empty enabled primary entry, valid parent links, dynamic parameter substitution and document titles.
- **Router integration tests**: exercise every mapping above with `provideRouter`/`RouterTestingHarness`, including `/applications/new` precedence, tailoring legacy routes, query parameters, document ID, root/wildcard redirect, nested details, back/forward navigation and exactly one correct active area. Include rejected/cancelled navigation and query-only changes.
- **Access tests**: verify every guard assignment against the required matrix; signed-out protected direct links go to sign-in with intact `returnUrl`; authenticated users reach intended pages; Dashboard, the normalized job listing, sign-in and registration remain public. Verify logout leaves protected content and expired or removed sessions do not pass the guard.
- **Shell interaction tests**: desktop and mobile menu open/close, Enter/Space/Escape, focus restoration, `aria-expanded`, `aria-current`, visible focus and contextual link ownership. Verify Tailoring links remain enabled and Settings remains hidden; ordinary empty data and temporary API errors must not change area visibility.
- **Manual real-browser checks**: at desktop and 320px, inspect actual layout, usable controls, keyboard traversal and overflow; open representative detail pages and source-specific tailoring links. Unit tests in jsdom alone cannot establish CSS geometry or true keyboard behavior.
- **Service-backed checks**: with valid user, profile, jobs, report, tailoring requests and completed output fixtures, verify session/history/preview/download and job/report context. Treat backend unavailability as a blocked verification, not proof the client has no feature.
- **Acceptance**: execute SC-001 through SC-006 in the spec, including five representative users and measured first-attempt success; tests alone do not prove usability.

## Risks and Dependencies

| Risk or dependency | Mitigation |
|---|---|
| User input says no tailoring exists, but routes and full client pages do exist; runtime availability is not established | Preserve all functionality; verify a working destination before release; do not fabricate one. |
| Local API at `localhost:8000` was unreachable during planning | Obtain approved local/service-backed test environment and representative authenticated fixtures; record a blocked release gate until verified. |
| Existing test build fails in unrelated application and normalized-job fixtures even with a tailoring include filter | Record exact baseline errors in quickstart; fix separately or isolate tests with an approved configuration before claiming validation. |
| Existing pipeline uses in-memory sample workflow items, unlike the application journal | Name it Workflow pipeline under Jobs; do not migrate or synchronize data. |
| Metadata, titles and links can diverge or legacy route data can be overwritten | Route ownership lives in metadata; preserve `source` fields; verify route inventory and launch tests. |
| Responsive navigation could make destinations inaccessible or duplicate controls | One navigation tree, explicit disclosure and focus behavior, browser checks at 320px and desktop. |
| Direct-link hosting may depend on server fallback | Use the existing deployment fallback configuration; validate a refreshed deep link in the target environment without changing backend business logic. |
