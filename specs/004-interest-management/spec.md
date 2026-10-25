# Feature Specification: Interest Management UI

**Feature Branch**: `not created`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Implement the frontend experience for managing a user's job interests in the Talent Intelligence Platform. Users must be able to browse their interests, search and filter jobs, navigate paginated results, and remove interests. Jobs submitted for normalization are automatically added to interests by the backend."

## Clarifications

### Session 2026-10-22

- Q: What endpoints and interaction points define the interest lifecycle, including job details? → A: Use `GET /jobs/interests` (listing), `POST /jobs/{job_id}/interest` (add), and `DELETE /jobs/{job_id}/interest` (remove); users can also toggle/set interest directly from the job details page.
- Q: How should the normalized job details view indicate and initialize a job's current interest state when loaded? → A: An interest button is always visible on the job details view that allows toggling interest, and its state is updated upon user interaction.
- Q: What should the URL route and primary navigation label be for the user's interests view? → A: Route `/jobs/interests` with primary navigation label "Interests".
- Q: When removing an interest from the listing, should users be asked for confirmation before executing the removal? → A: An inline or modal confirmation prompt must be confirmed by the user before executing removal.
- Q: What debounce delay should be applied to filter inputs (company, title, location) to balance UI responsiveness with reducing unnecessary API calls? → A: 300 ms debounce delay across all text filter inputs.
- Q: When clicking on an interest in the listing, should users be able to navigate directly to the normalized job details view for that job? → A: Yes, clicking the job title navigates directly to `/normalized-jobs/{id}`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Personal Job Interests (Priority: P1)

As an authenticated user, I want to view a list of job postings I have shown interest in, so that I can keep track of all relevant opportunities in one centralized place.

**Why this priority**: Displaying the user's saved interests with complete and accurate job headers is the primary purpose and core MVP value of the feature.

**Independent Test**: Log in as an authenticated user who has saved interests, navigate to the Interests page, and verify that all current interests display with title, company, location, posting date (if available), source/link (if available), and creation date, ordered newest first.

**Acceptance Scenarios**:

1. **Given** an authenticated user with recorded job interests, **When** they navigate to `/jobs/interests` (via the "Interests" navigation link) without query parameters, **Then** the first page of up to 20 interests is displayed, ordered chronologically by interest creation date (newest first).
2. **Given** an interest item in the listing, **When** the item renders, **Then** it displays the job title (as a clickable link navigating to `/normalized-jobs/{id}`), company name, location, job posting date (when available), original posting URL/link (when available), and the date the interest was recorded.
3. **Given** an interest item with missing optional attributes (such as posting date or source link), **When** rendered, **Then** consistent placeholders or fallbacks are shown without breaking the item display.
4. **Given** an authenticated user with zero saved interests, **When** they view the listing, **Then** an informative empty state is shown explaining that no interests exist yet, with guidance on how jobs get added.
5. **Given** an unauthenticated visitor, **When** they attempt to access the interests view, **Then** they are redirected to login or presented with the standard authentication prompt.

---

### User Story 2 - Filter Interests by Job Attributes (Priority: P2)

As an authenticated user with multiple interests, I want to filter my interests by company, job title, and location, so that I can quickly narrow down opportunities matching my immediate focus.

**Why this priority**: As the number of interests grows, filtering becomes essential for discovering and managing specific saved jobs without paging through all records.

**Independent Test**: Enter values into company, job title, and location filter controls individually and in combination, and verify that the listed results reflect all applied filters via server-side queries, debounced input, and reset to page 1.

**Acceptance Scenarios**:

1. **Given** a populated list of interests, **When** the user types into the company, job title, or location filter fields, **Then** input is debounced and a filtered query is executed using case-insensitive partial matching.
2. **Given** a user applies multiple filters simultaneously (e.g., Company and Title), **When** the results load, **Then** only interests matching all applied criteria are displayed.
3. **Given** a user is viewing page 2 or later of results, **When** any filter value is modified, **Then** the pagination automatically resets to page 1.
4. **Given** active filters produce zero matching records, **When** the query completes, **Then** an empty-search state is displayed with a clear option to reset or revise filters.
5. **Given** active filters are applied, **When** the user clicks "Clear Filters", **Then** all filter inputs are cleared, pagination resets to page 1, and the unfiltered interest list is restored.
6. **Given** rapid successive filter adjustments, **When** asynchronous responses return out of order, **Then** results from older, stale queries are discarded in favor of the latest filter query.

---

### User Story 3 - Paginate Interest Results (Priority: P2)

As an authenticated user, I want to navigate through pages of my interests and see total record counts, so that I can browse larger collections efficiently without client performance issues.

**Why this priority**: Essential for handling user interest collections larger than the default page size of 20 items using server-side pagination.

**Independent Test**: Load an account with more than 20 interests, navigate forward and backward between pages, and verify page indicator, total count, disabled navigation boundaries, and boundary corrections.

**Acceptance Scenarios**:

1. **Given** an interest collection with more than 20 records, **When** the initial page loads, **Then** exactly 20 records are displayed with current page indicated as 1 alongside the total matching count.
2. **Given** the user is on page 1, **When** observing navigation controls, **Then** the "Previous" action is disabled and the "Next" action is enabled.
3. **Given** the user is on page 1 and clicks "Next", **When** the next page loads, **Then** items 21 through 40 (or the remaining subset) are displayed with current page indicated as 2.
4. **Given** the user reaches the final page of results, **When** observing navigation controls, **Then** the "Next" action is disabled.
5. **Given** configurable page sizes are supported by application conventions, **When** the user changes the page size, **Then** the page resets to 1 and reloads with the newly selected page size.

---

### User Story 4 - Remove an Interest (Priority: P3)

As an authenticated user, I want to remove a job from my interests when I am no longer pursuing it, so that my list remains clean and up to date.

**Why this priority**: While viewing and filtering are primary, maintaining the list by removing unneeded items completes the interest lifecycle.

**Independent Test**: Trigger interest removal on a specific item, verify that a confirmation prompt is required before sending the request, verify that duplicate submissions are blocked while pending, confirm the item disappears upon success, and confirm pagination totals update without deleting the underlying normalized job.

**Acceptance Scenarios**:

1. **Given** an interest item displayed in the listing, **When** the user clicks the removal action, **Then** an inline or modal confirmation prompt is displayed asking the user to confirm the removal.
2. **Given** the confirmation prompt is displayed, **When** the user cancels the confirmation, **Then** the prompt closes and the interest remains in the list with no request sent.
3. **Given** the confirmation prompt is displayed, **When** the user confirms the removal, **Then** the removal request is sent via `DELETE /jobs/{job_id}/interest`, duplicate clicks are prevented while the request is in flight, and the UI provides active loading feedback.
4. **Given** a successful removal response from the service, **When** the action completes, **Then** the removed item is eliminated from view, total counts update, and visible results reflect the updated state.
5. **Given** a removal request is executed on the last item of a subsequent page (e.g., page 3), **When** that item is successfully removed and page 3 becomes empty, **Then** pagination automatically adjusts to the preceding valid page (page 2).
6. **Given** a removal request fails due to network or service error, **When** the error occurs, **Then** an explicit error message is displayed, the item remains in the list, and user actions are not silently discarded.
7. **Given** an interest is removed, **When** verifying data boundaries, **Then** only the interest association is removed; the underlying normalized job entity is not deleted.

---

### User Story 5 - Manage Interest from Job Details (Priority: P2)

As an authenticated user viewing a specific normalized job's details, I want an interest toggle action available on the job details view, so that I can set or remove interest for that job without leaving the details page.

**Why this priority**: Directly integrates interest tracking into the primary job inspection view, allowing users to express interest or withdraw interest immediately upon evaluating job specifics.

**Independent Test**: Navigate to an existing normalized job detail page, trigger the interest action (add via `POST /jobs/{job_id}/interest` or remove via `DELETE /jobs/{job_id}/interest`), and confirm the UI button/status indicator reflects the updated interest state with pending-request safeguards.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a normalized job detail page, **When** the page header loads, **Then** an interest toggle button is always visible alongside other job actions.
2. **Given** the user triggers the interest action to add interest, **When** the request is initiated, **Then** the request is sent via `POST /jobs/{job_id}/interest`, the button shows pending feedback preventing duplicate clicks, and upon success updates its appearance to indicate interest is saved.
3. **Given** the user triggers the interest action to remove an existing interest, **When** the request completes via `DELETE /jobs/{job_id}/interest`, **Then** the button updates its state to indicate the job is no longer marked as an interest.
4. **Given** an interest add or remove request fails, **When** the failure occurs, **Then** an explicit error message is displayed and the button retains its prior state.

---

### User Story 6 - Automatic Interest Addition via Job Normalization (Priority: P3)

As an authenticated user submitting a job for normalization, I want the normalized job to automatically appear in my interests, so that I do not have to perform a redundant manual "add to interest" step.

**Why this priority**: Seamlessly connects job ingestion with interest tracking according to platform rules.

**Independent Test**: Submit a job URL or content through the normalization workflow and confirm that the resulting normalized job is present in the user's interests list without duplicate creation calls from the frontend.

**Acceptance Scenarios**:

1. **Given** a user successfully submits a job posting for normalization, **When** normalization completes, **Then** the system automatically reflects the job in the user's interests list upon subsequent viewing or refresh.
2. **Given** job normalization in progress, **When** tracking status, **Then** the frontend does not dispatch a redundant manual interest creation request, relying on the platform's automatic interest assignment.
3. **Given** job normalization fails, **When** error feedback is presented to the user, **Then** no incomplete or phantom interest entry is added to the user's interest view.

---

### Edge Cases

- **Session Expiration / Unauthorized Access**: When an authenticated session expires while browsing or filtering interests, the system displays an appropriate session expiration notice or redirects to authentication without unhandled errors.
- **Service Disruption / Network Failure**: When the interests service is unreachable or returns a server error, the system displays a clear error state explaining that interests could not be loaded and offers a manual retry action.
- **Empty Filter Results**: When user filters match zero records, the UI clearly differentiates between "user has no interests yet" and "no interests match the current filter criteria", providing a 1-click "Clear Filters" action.
- **Rapid Navigation / In-flight Removal**: If a user navigates between pages or alters filters while an interest removal is in flight, the pending request state does not cause race conditions or corrupt pagination state.
- **Last Item on Page Removed**: When removing the sole item on page N (where N > 1), the listing detects the empty page and navigates back to page N-1.
- **Blank or Missing Data Fields**: Any interest whose linked job lacks specific headers (such as location, company, or posting date) renders graceful placeholders (e.g., "Not specified" or an em dash) rather than broken layouts or empty blanks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an authenticated view at route `/jobs/interests`, accessible via an "Interests" link in the primary application navigation header, allowing users to view their own recorded job interests.
- **FR-002**: Each interest card or row MUST display available job header details: job title (linking directly to `/normalized-jobs/{id}`), company name, location, posting date (if present), source link / URL (if present), and interest creation date.
- **FR-003**: The system MUST reuse the existing normalized job header data returned by the backend without duplicating or reconstructing job definitions on the client.
- **FR-004**: The system MUST support optional filtering by company, job title, and location, sending filter criteria to the backend listing service.
- **FR-005**: Text filters MUST support case-insensitive partial matching as evaluated by the backend service.
- **FR-006**: The system MUST allow combining multiple filters simultaneously, returning only records that meet all active criteria.
- **FR-007**: The system MUST provide a clear-filters control that resets all filter criteria and returns the list to its unfiltered state.
- **FR-008**: The system MUST reset pagination to page 1 whenever any filter criterion changes.
- **FR-009**: The system MUST debounce filter text inputs with a 300 ms delay to avoid excessive network requests while users are typing.
- **FR-010**: The system MUST ensure that out-of-order or stale filter responses do not overwrite the results of more recent user selections.
- **FR-011**: The system MUST order interest records chronologically by interest creation date descending and MUST NOT apply conflicting client-side sorting.
- **FR-012**: The system MUST implement server-side pagination with a default page size of 20 records and default initial page of 1.
- **FR-013**: The system MUST display the current active page number and the total count of matching records.
- **FR-014**: The system MUST provide previous and next page navigation controls, disabling "Previous" on the first page and "Next" on the final page.
- **FR-015**: When configurable page sizes are supported, changing the page size MUST reset the current page to 1.
- **FR-016**: The system MUST allow users to remove a job from their interests via `DELETE /jobs/{job_id}/interest`, both from the interests listing and from the normalized job details view. In the listing, removal MUST require user confirmation before executing.
- **FR-017**: The system MUST allow users to add an unrecorded normalized job to their interests directly from the normalized job details view via the interest service (`POST /jobs/{job_id}/interest`).
- **FR-018**: The system MUST prevent duplicate or repeated add/removal actions on an item while its request is in flight.
- **FR-019**: When removal succeeds in the listing, the system MUST update the visible results and pagination metadata without requiring a full manual page reload.
- **FR-020**: If an interest removal causes the current listing page to become empty (when page > 1), the system MUST transition to the nearest preceding valid page.
- **FR-021**: When an add or removal action fails, the system MUST display a clear error message and preserve the existing interest state.
- **FR-022**: Removing an interest MUST NOT delete or modify the underlying normalized job posting.
- **FR-023**: The system MUST reflect automatic interest addition upon completion of job normalization without issuing a duplicate manual interest creation request from the client.
- **FR-024**: The system MUST retrieve interest listings from `GET /jobs/interests` supporting `page`, `limit`, and filters `title`, `company`, `location`.
- **FR-025**: The system MUST provide consistent loading indicators, empty states, error states, and retry capabilities across the interests interface.
- **FR-026**: The system MUST handle authentication expiration and authorization errors consistently with platform conventions.

### Key Entities *(include if feature involves data)*

- **Job Interest**: An association between the authenticated user and a normalized job, containing an interest identifier, interest creation timestamp, and the referenced normalized job entity.
- **Normalized Job Header**: Core metadata for the saved job, including job identifier, title, company, location, posting date (optional), and source posting URL (optional).
- **Interest Query**: Query parameters defining pagination (page number, page size / limit) and filters (company, title, location).
- **Interest Page Result**: Paginated container returned by the service containing an array of interest items, total record count, current page, and page limit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of interest items presented in the listing display all available job header fields (title, company, location, posting date, source link) and the interest creation date.
- **SC-002**: On initial load, the interests listing displays within 2 seconds under standard broadband network conditions.
- **SC-003**: 100% of interest queries preserve the backend's interest creation date descending sort order.
- **SC-004**: Filter inputs trigger server requests after a 300 ms typing pause (debounced), eliminating unneeded keystroke queries.
- **SC-005**: 100% of filter modifications automatically reset pagination to page 1.
- **SC-006**: When an interest is removed, the visible listing and total count update in under 1 second following server confirmation.
- **SC-007**: Under network failure or server error conditions, 100% of failed operations display clear user error feedback with a viable retry path.
- **SC-008**: 0% duplicate interest creation requests are issued by the frontend during or following job normalization.

## Assumptions

- The user must be authenticated to access the interests management view. Unauthenticated users are redirected to login.
- The backend interests listing endpoint is `GET /jobs/interests`, returns results pre-sorted by interest creation date descending, and provides pagination metadata (`page`, `limit`, `total`, `items`).
- The backend interests endpoint handles case-insensitive substring matching for `title`, `company`, and `location` filter query parameters.
- The backend provides endpoints `POST /jobs/{job_id}/interest` to add an interest and `DELETE /jobs/{job_id}/interest` to remove an interest without deleting the underlying normalized job.
- When jobs are submitted for normalization, the backend platform automatically records an interest for the submitting user; no client-side interest creation endpoint call is needed for the normalization flow.
- Application status management (e.g., tracking job applications, interviews, or offers) is explicitly out of scope for this feature.
- Page numbering is 1-indexed. Default limit is 20 items per page.
- Missing optional data fields (such as posting date or source URL) are represented with graceful placeholders rather than omitted or empty layout sections.
