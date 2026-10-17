# Feature Specification: Normalized Job Listing

**Feature Branch**: `not created`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Page/component to list all normalized jobs from GET `/jobs/normalize`. The API accepts filters `title`, `company`, `location`, and `source`. Results are paginated with a default size of 20; users can choose `limit` and `page` in the query. Default order is `postingDate` descending and is not changeable. Listing fields: `id`, `title`, `company`, `location`, `postingDate`, `source`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse normalized jobs (Priority: P1)

As a job seeker, I want to browse a list of normalized job postings so that I can compare opportunities and see their key details.

**Why this priority**: Showing the available jobs and their essential details is the core value of the feature.

**Independent Test**: Open the job listing with available results and verify the first page, its ordering, and the required details on each row.

**Acceptance Scenarios**:

1. **Given** normalized jobs are available, **When** a user opens the listing without choosing pagination values, **Then** the first page contains at most 20 jobs ordered from newest to oldest by posting date.
2. **Given** a job appears in the listing, **When** the user views its row, **Then** its identifier, title, company, location, posting date, and source are visible.
3. **Given** two jobs have the same posting date, **When** they are listed, **Then** both remain visible; no additional tie-breaking order is required.

### User Story 2 - Find jobs with filters (Priority: P1)

As a job seeker, I want to filter jobs by title, company, location, or source so that I can narrow the listing to relevant opportunities.

**Why this priority**: Filtering makes a potentially large listing useful for finding relevant opportunities.

**Independent Test**: Apply each filter individually and in combination, then verify that the resulting jobs satisfy the selected criteria.

**Acceptance Scenarios**:

1. **Given** matching jobs exist, **When** a user applies a title, company, location, or source filter, **Then** the listing contains only jobs matching that filter.
2. **Given** a user applies multiple filters, **When** the listing updates, **Then** each returned job matches every applied filter.
3. **Given** no job matches the selected filters, **When** the listing updates, **Then** an empty-results state is shown and the user can change or clear the filters.

### User Story 3 - Navigate result pages (Priority: P2)

As a job seeker, I want to choose how many jobs appear per page and move between pages so that I can browse results at a useful pace.

**Why this priority**: Pagination makes browsing manageable while preserving access to all matching jobs.

**Independent Test**: Choose a page size, navigate between result pages, and verify each page contains the requested slice without exceeding the chosen size.

**Acceptance Scenarios**:

1. **Given** more matching jobs exist than fit on one page, **When** a user chooses a page size and page, **Then** the listing shows that page with no more than the chosen number of jobs.
2. **Given** a user omits the page size, **When** the listing is requested, **Then** the page size defaults to 20.
3. **Given** the user is on a later page and changes filters, **When** the results update, **Then** the listing returns to the first page of the filtered results.
4. **Given** a requested page has no results, **When** the listing updates, **Then** an empty state is shown with a way to return to a page containing results or adjust the filters.

### Edge Cases

- No jobs are available before any filters are applied; show a clear empty state.
- A filter has no matches; show the empty-results state rather than stale results.
- A requested page is outside the available range; show no stale results and provide a way back to available results.
- A page size or page value is not a positive whole number; show a clear validation message and let the user correct the value.
- A job has a missing or blank display value; show a consistent placeholder for that value without hiding the rest of the job.
- The job service cannot be reached or returns an error; explain that results could not be loaded and offer a retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The listing MUST retrieve and display normalized job postings from the existing jobs service.
- **FR-002**: Each listed job MUST display its identifier, title, company, location, posting date, and source.
- **FR-003**: The listing MUST support optional filtering by title, company, location, and source, and combine applied filters so results match all selected criteria.
- **FR-004**: When a text filter is used for title, company, or location, matching MUST be case-insensitive and allow partial text matches. The source filter MUST match the selected source value.
- **FR-005**: The listing MUST default to 20 jobs per page when no page size is supplied and MUST allow the user to choose a page size and page.
- **FR-006**: The listing MUST order results by posting date, newest first. Users MUST NOT be offered an alternative sort order.
- **FR-007**: The listing MUST show a clear empty state when the current query has no results and MUST provide a way to revise or clear filters.
- **FR-008**: When page or page-size values are invalid, the listing MUST explain the validation issue and allow the user to correct it.
- **FR-009**: If job results cannot be loaded, the listing MUST communicate the failure and provide a retry action.
- **FR-010**: The listing MUST prevent results from an earlier query from being presented as though they match the user's current filters or pagination selection.

### Key Entities *(include if feature involves data)*

- **Normalized job**: A job posting with an identifier, title, company, location, posting date, and source.
- **Listing query**: Optional title, company, location, and source filters together with the requested page and page size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On an unfiltered first visit, 100% of listing results are ordered by posting date from newest to oldest, and no more than 20 results are shown.
- **SC-002**: 100% of displayed job rows expose all six required fields.
- **SC-003**: In acceptance testing, 100% of returned jobs satisfy every applied filter, whether used alone or in combination.
- **SC-004**: At least 90% of representative users can locate a matching job or confirm that none match within one minute using filters and pagination.

## Assumptions

- The intended audience is any user who can access the existing jobs listing; no additional role-specific permissions are introduced.
- Page numbering starts at 1. An omitted page means the first page.
- Title, company, and location filters use case-insensitive partial matching; source is matched as a source value. These are default matching behaviors because the request does not specify filter matching rules.
- The existing service provides normalized jobs at `GET /jobs/normalize`, accepts the `title`, `company`, `location`, `source`, `limit`, and `page` query parameters, and returns the six specified job fields.
- The paginated response contains `Items` (an array of normalized jobs), `limit` (integer), `total` (integer), and `page` (integer).
- A placeholder such as an em dash is used for a missing or blank display value.
- Authentication, creating or editing jobs, and changing the default sort order are outside this feature.
