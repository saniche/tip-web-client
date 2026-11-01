# Feature Specification: Client Feature Organization and Navigation

**Feature Branch**: Not created

**Created**: 2026-11-01

**Status**: Draft

**Input**: Reorganize existing client functionality into clear business areas while preserving routes and capabilities, and require authentication for all feature pages except Dashboard and the normalized job listing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find existing work by business area (Priority: P1)

As a platform user, I want related destinations grouped under recognizable business areas so I can find and continue my work without confusing the workflow pipeline with my application journal.

**Why this priority**: Finding existing functionality is the core business outcome.

**Independent Test**: From the primary navigation, visit each available business area and reach each of its existing destinations without relying on a saved address.

**Acceptance Scenarios**:

1. **Given** a user can access an existing destination, **When** they browse the primary navigation, **Then** they can find it under its designated business area.
2. **Given** a user is viewing the workflow pipeline or application journal, **When** they identify the current area and page, **Then** the two views have distinct names and purposes.
3. **Given** a user opens a list, detail, creation, or session page, **When** the page appears, **Then** its primary area is clearly identified and its title describes the current page.

---

### User Story 2 - Continue established workflows and links (Priority: P1)

As a returning user, I want existing links and contextual journeys to keep working so I can move between jobs, matching, applications, and tailoring without losing access or security.

**Why this priority**: Reorganization must not break established work or bypass existing access restrictions.

**Independent Test**: Open existing addresses directly while signed in and signed out, and verify that only the two public feature pages are accessible without authentication.

**Acceptance Scenarios**:

1. **Given** an existing bookmarked address or contextual link, **When** an authenticated user opens it, **Then** it reaches the same capability or an appropriate equivalent without losing relevant identifiers or launch context.
2. **Given** a signed-out user opens a protected destination, **When** access is checked, **Then** they are redirected to sign-in with the original requested address recorded as the return destination.
3. **Given** a user views a normalized job or matching report, **When** they follow an existing tailoring action, **Then** the tailoring session opens with the selected source retained and is identified as part of Tailoring.
4. **Given** an existing tailoring request has completed documents, **When** the user navigates to its details, **Then** available CV and cover-letter previews and downloads remain accessible.
5. **Given** a signed-out user, **When** they open Dashboard or the normalized job listing, **Then** the page remains accessible; sign-in and registration are also accessible.
6. **Given** a user signs out from a protected page, **When** the session ends, **Then** the protected page is left and Dashboard is shown.

---

### User Story 3 - Navigate comfortably on different screens (Priority: P2)

As a user on a desktop or smaller screen, I want navigation, page context, and controls to remain usable so I can move between areas without losing my place.

**Why this priority**: The same business journeys must remain available across supported screen sizes.

**Independent Test**: Navigate through all available areas using pointer and keyboard at desktop and narrow mobile widths, including a detail page.

**Acceptance Scenarios**:

1. **Given** a narrow screen, **When** a user opens and operates navigation, **Then** all available areas are reachable without page-level horizontal scrolling, and controls remain usable.
2. **Given** navigation is used with a keyboard, **When** a user moves through and activates its controls, **Then** focus is visible and each available destination can be reached.
3. **Given** a user visits a nested or detail page, **When** they inspect its context, **Then** the corresponding primary area is active and a meaningful way back to its parent is available, including breadcrumbs where appropriate.

---

### User Story 4 - Avoid empty or misleading areas (Priority: P2)

As a user, I want unavailable business areas to be hidden or clearly disabled so I am not led to empty pages or features that do not exist.

**Why this priority**: Trustworthy navigation avoids false promises while leaving room for future functionality.

**Independent Test**: Compare each area with its working destinations and verify that an area with none cannot be activated as though it were available.

**Acceptance Scenarios**:

1. **Given** an area has no working destination, **When** the user views primary navigation, **Then** the area is either absent or visibly disabled and cannot be activated.
2. **Given** at least one existing tailoring destination works, **When** the user browses primary navigation, **Then** Tailoring is available and owns the existing tailoring session, history, requests, and document views.
3. **Given** Settings has no existing working destination, **When** the user views navigation, **Then** no unsupported settings or empty functional page is presented.
4. **Given** tailoring or preferences are added later, **When** their areas gain working destinations, **Then** they can be placed in Tailoring or Settings respectively without changing the ownership or addresses of other areas.

### Edge Cases

- An address includes an unknown item identifier or unavailable item: retain the existing destination's error behavior; do not imply successful navigation to an item. An expired session must not grant access to a protected destination.
- A tailoring launch contains a job or report identifier, or uses an older source-specific address: retain the source and existing conflict handling.
- A protected address is opened directly while signed out: redirect to sign-in with the requested address rather than displaying protected content.
- A matching or tailoring service is unavailable or contains no results: keep existing feedback and recovery actions; a temporary data error must not be presented as a new feature.
- A nested page, query string, or detail identifier must not cause another business area to be marked active, including the distinction between the pipeline and interests.
- The navigation is viewed at small widths or with keyboard input: no destination becomes inaccessible because of layout or focus handling.
- An unknown address retains the existing fallback to the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The primary business areas MUST be ordered and labeled Dashboard, My Profile, Jobs, Job Matching, Applications, Tailoring, and Settings, omitting or clearly disabling any area with no working destination.
- **FR-002**: Dashboard MUST own the platform and workflow overview; My Profile MUST own profile viewing, document upload, building, and editing.
- **FR-003**: Jobs MUST own job normalization, normalized job lists and details, and interests. Job Matching MUST own matching sessions and matching report lists and details. Applications MUST own the application journal, creation, details, and follow-up management.
- **FR-004**: The existing lightweight workflow pipeline MUST remain reachable at `/jobs`, clearly differentiated from Applications. The plan MUST decide whether it belongs under Jobs or is merged into Dashboard; neither option may remove the capability or break the existing address.
- **FR-005**: Tailoring MUST be the sole primary home for tailoring sessions, history, requests, tailored CVs, cover letters, previews, and downloads. Other areas MAY provide contextual links into Tailoring without hosting those features as separate primary entries.
- **FR-006**: Each area with at least one working destination MUST be reachable from primary navigation. An area with none MUST be hidden or clearly disabled; the plan MUST record the choice for each such area. This feature MUST NOT create functionality merely to populate an area.
- **FR-007**: Settings MUST NOT offer unsupported settings or preferences. The navigation structure MUST allow future supported preferences under Settings and future tailoring capabilities under Tailoring without changing other areas or their existing addresses.
- **FR-008**: The following existing addresses MUST continue to reach their current capabilities, directly or through appropriate redirects: `/`, `/dashboard`, `/auth`, `/auth/register`, `/jobs`, `/jobs/interests`, `/profile`, `/normalize-job`, `/normalized-jobs`, `/normalized-jobs/:id`, `/matching-session`, `/matching-reports`, `/matching-reports/:id`, `/applications`, `/applications/new`, and `/applications/:id`.
- **FR-009**: Existing tailoring addresses MUST also remain reachable, directly or through appropriate redirects: `/tailoring-session`, `/tailored-cvs`, `/tailored-cvs/:id`, `/tailored-cvs/:id/documents/:documentId`, `/tailored-cvs/new/job/:id`, and `/tailored-cvs/new/report/:id`. Job and report launch context, including existing query parameters, MUST be retained.
- **FR-010**: Dashboard (`/dashboard`) and the normalized job listing (`/normalized-jobs`) MUST be the only feature pages accessible without authentication. All other feature destinations, including `/profile`, `/jobs`, `/normalize-job`, and `/normalized-jobs/:id`, MUST require authentication. Sign-in and registration MUST remain public. Existing protected routes and authorization MUST remain protected; signed-out visitors to a protected destination MUST be redirected to sign-in with the original requested address recorded as the return destination. Signing out MUST leave protected content and return to Dashboard.
- **FR-011**: Each available destination MUST be reachable from its designated business area, with each feature assigned to only one primary area. Contextual links between related work MAY remain available.
- **FR-012**: Navigation MUST use consistent labels and icons, clearly indicate exactly one active business area for each destination owned by an area, and distinguish page titles. Authentication pages and the unknown-address fallback MUST retain their existing behavior without requiring a misleading active business area.
- **FR-013**: Detail and nested pages MUST provide understandable location context and a way to return to the relevant parent; breadcrumbs MUST be used where appropriate and agree with area ownership.
- **FR-014**: Navigation and all available destinations MUST be usable on desktop and narrow screens, including by keyboard, with visible focus and without page-level horizontal scrolling caused by navigation.
- **FR-015**: Existing contextual relationships between normalized jobs, matching reports, applications, and tailoring outputs MUST remain understandable and any existing contextual links MUST continue to lead to the relevant destination.
- **FR-016**: This work MUST NOT rewrite existing feature implementations, alter backend business logic, remove capabilities, or introduce breaking address changes unless necessary to preserve an equivalent destination.

### Existing destination inventory

The current client contains a workflow pipeline and tailoring routes, including session launch, history, request details, document preview, and download controls. The original assumption that no tailoring client feature exists does not match the inspected route table and pages. Tailoring navigation must expose the existing session and history; service-backed verification remains a separate acceptance check and must not hide these links.

### Key Entities

- **Business area**: A user-facing grouping that owns related destinations and has an availability state.
- **Destination**: An existing page or workflow, including its address, access behavior, title, and owning area.
- **Workflow item**: A normalized job, matching report, application, or tailoring request or output that may be connected to related work through contextual navigation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In an inventory-based acceptance test, 100% of the existing addresses listed in FR-008 and FR-009 reach their existing capability or an equivalent destination, including applicable identifiers and source context.
- **SC-002**: In an access-state test, 100% of feature destinations except Dashboard and the normalized job listing require authentication; both public feature pages and sign-in and registration remain accessible signed out.
- **SC-003**: At desktop and 320-pixel-wide mobile viewports, testers can reach 100% of available business areas and their destinations using both pointer and keyboard without navigation-caused page-level horizontal scrolling.
- **SC-004**: In a usability exercise with at least five representative users, at least 80% locate a normalized job, a matching report, and the application journal on their first attempt, and correctly distinguish the pipeline from the journal.
- **SC-005**: All tested area-owned list, creation, session, and detail destinations show the correct single active area; all tested nested and detail destinations provide a clear parent return path.
- **SC-006**: Review of all primary navigation entries finds no duplicate ownership of a feature and no enabled area without a working destination.

## Assumptions

- The existing client route table and page behavior are the baseline for preservation; the project constitution currently contains only unfilled placeholders and adds no actionable constraints.
- Working means a user can open a destination and use its intended capability under its normal access and service prerequisites; an empty data set alone does not make an otherwise functional destination unavailable.
- Tailoring client pages are already present, despite the input's contrary assumption. Their navigation is enabled; operational behavior with the target service remains subject to end-to-end verification.
- The existing sign-in and registration destinations remain public session controls rather than additional primary business areas. The existing sign-in page does not automatically navigate to the guard's recorded return destination after login; this specification requires the destination to be recorded, not a change to that login flow.
- Representative user validation and the required services or fixtures for exercising existing workflows are available during acceptance.
