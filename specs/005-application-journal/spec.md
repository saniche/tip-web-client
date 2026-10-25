# Feature Specification: Application Journal UI

**Feature Branch**: `005-application-journal`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: Implement the frontend experience for tracking a user's job applications, including listing, filtering, pagination, create/edit, status management, history, and supported deletion.

## User Scenarios & Testing

### User Story 1 - Browse and find applications (Priority: P1)

An authenticated user opens the application journal to see the jobs they are pursuing, their current application statuses, relevant job details, and follow-up information. The user can narrow the journal by company, job title, and location and move through matching results.

**Why this priority**: The journal's primary value is giving users an accurate, searchable overview of their applications.

**Independent Test**: With multiple journal entries and users present, authenticate as one user, browse the list, filter by each field and combinations of fields, and navigate the result pages. Only that user's matching entries should appear, in backend order.

**Acceptance Scenarios**:

1. **Given** an authenticated user with journal entries, **When** they open the journal, **Then** they see up to 20 entries from page 1, the total number of matching entries, and the current page.
2. **Given** entries with available job header data, **When** an entry is listed, **Then** the title, company, location, posting date, original posting link, and current status are shown when available, together with available recruiter and follow-up details.
3. **Given** multiple filters, **When** the user applies company, title, and location criteria, **Then** all criteria are applied together across the complete result set, not only the visible page.
4. **Given** the user changes a filter, **When** matching results load, **Then** the list starts at page 1 and results from an older request cannot replace the newer selection.
5. **Given** there are no matching entries or the service is unavailable, **When** the list finishes loading, **Then** an appropriate empty or error state is shown, and errors provide a retry action.
6. **Given** the user changes page size, **When** the new size is applied, **Then** the list returns to page 1 and respects the service's supported size limit.

### User Story 2 - Record and maintain an application (Priority: P1)

An authenticated user selects any existing normalized job and creates a journal entry with recruiter, contact, follow-up, work authorization, and notes information. The user can later review and edit those fields.

**Why this priority**: Users must be able to capture application activity before they can reliably track progress.

**Independent Test**: Select an existing normalized job, create a journal entry with optional fields, verify the saved entry, edit the allowed fields, and verify that submitting twice while a request is pending creates only one entry.

**Acceptance Scenarios**:

1. **Given** available normalized jobs, **When** the user starts a new entry, **Then** they can find and select any existing normalized job.
2. **Given** a selected job, **When** the user creates an entry without selecting an initial status, **Then** the entry uses the backend's `NotStarted` default.
3. **Given** the selected job is currently in the user's interests, **When** the user successfully creates an application entry, **Then** the backend performs the transition atomically and the frontend does not issue a separate interest deletion.
4. **Given** an entry already exists for the selected job, **When** the backend rejects a duplicate, **Then** the user receives a clear duplicate-entry message and the existing entry is not overwritten.
5. **Given** an existing entry, **When** the user edits recruiter details, contact date, follow-up date, work authorization discussion, or notes, **Then** the changes are saved while its job and status history remain unchanged.
6. **Given** invalid input or a failed request, **When** the user submits, **Then** validation or service feedback is shown and the user can correct or retry without a duplicate submission.

### User Story 3 - Update status and review history (Priority: P1)

An authenticated user changes an application's status, optionally records a note explaining the change, and reviews the status history.

**Why this priority**: Current status and its timeline are the core tracking value of an application journal.

**Independent Test**: Change an entry through each supported status value, include and omit a note, and verify that the current status and chronological history reflect the backend response. Verify that history entries have no edit or delete controls.

**Acceptance Scenarios**:

1. **Given** an application entry, **When** the user chooses a supported status, **Then** the UI submits that exact backend status value and an optional note.
2. **Given** a successful status update, **When** the response is displayed, **Then** the current status and history match the backend's latest data.
3. **Given** status history, **When** the detail view is shown, **Then** every event displays its status and date/time, displays a note when present, and appears in the order returned by the backend.
4. **Given** an update fails, **When** the response is an authorization, validation, conflict, or network error, **Then** the current status is not presented as successfully changed and an actionable error is shown.
5. **Given** a journal entry, **When** the user edits ordinary entry fields, **Then** no existing history entry can be edited or deleted.

### User Story 4 - Delete an application entry (Priority: P2)

An authenticated user can remove an application entry after confirming the action.

**Why this priority**: Users need to correct obsolete or mistakenly created records, but deletion is secondary to tracking.

**Independent Test**: Request deletion, cancel and verify the entry remains; confirm deletion and verify only the journal record is removed. Verify the normalized job remains available and no interest is recreated.

**Acceptance Scenarios**:

1. **Given** an application entry, **When** the user requests deletion, **Then** the UI asks for confirmation before making a request.
2. **Given** the user confirms deletion, **When** the backend succeeds, **Then** the entry is removed and the list remains on a valid page.
3. **Given** deletion fails, **When** the backend returns an error, **Then** the entry remains visible and the user receives an error message.

### Edge Cases

- The current page becomes invalid after deletion or another update; move to a valid page and reload from the backend.
- The service returns no entries for the requested filters or a page with no items.
- A result arrives after a newer filter or page selection; ignore the stale response.
- Optional job header, recruiter, dates, or note fields are absent or blank; render a consistent empty value without inventing data.
- The selected normalized job becomes unavailable before the create request completes; report the backend error and retain form values where possible.
- Duplicate creation returns a conflict; do not retry as an update or remove an interest.
- Authorization expires or access is denied during list, create, edit, status update, or deletion.
- A status update returns a successful current status but no history data; fetch the entry again when required to show authoritative history.
- Status history is empty or contains equal timestamps; preserve the order provided by the backend.
- A request is pending while the user tries to submit the same form or status change again.
- A backend page-size limit is lower than the requested value; display and use the page size returned by the backend.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide an authenticated application journal containing only entries authorized for the current user by the backend.
- **FR-002**: Each listed entry MUST display available normalized job header information, current status, and available recruiter, contact date, and follow-up date information without duplicating normalized job records in the frontend.
- **FR-003**: The system MUST allow filtering by company, job title, and location using backend partial, case-insensitive matching, applying all supplied criteria together.
- **FR-004**: The system MUST debounce text input, reset to page 1 when filters change, and prevent a stale response from replacing results for a newer query.
- **FR-005**: The system MUST preserve the backend's journal-creation-date-descending order and MUST NOT apply a conflicting client-side sort.
- **FR-006**: The system MUST use server-side pagination with page 1 and page size 20 by default, display current page and total matching records, offer previous and next navigation, and honor the backend's page-size limit.
- **FR-007**: The system MUST reset to page 1 when page size changes and handle empty results and pages invalidated by updates or deletions.
- **FR-008**: The system MUST provide clear-filters, loading, empty, error, and retry behaviors for the listing.
- **FR-009**: The system MUST allow users to select any existing normalized job when creating an application entry.
- **FR-010**: The system MUST allow creation with recruiter information, contact date, follow-up date, work authorization discussed, notes, and an initial status only when supported. When omitted, the backend's `NotStarted` default MUST be respected.
- **FR-011**: The frontend MUST rely on the journal-create operation for the backend's atomic interest-to-journal transition and MUST NOT issue a separate interest deletion as part of creation.
- **FR-012**: The system MUST display duplicate-entry conflicts, validation failures, authorization failures, and network/service errors in a clear user-facing manner.
- **FR-013**: The system MUST allow users to view and edit recruiter information, contact date, follow-up date, work authorization discussed, and notes, and MUST prevent duplicate submissions while a request is pending.
- **FR-014**: Ordinary entry editing MUST NOT modify or delete existing status-history records.
- **FR-015**: The system MUST allow status updates to `NotStarted`, `Registered`, `Applied`, `Contacted`, `Screening`, `Interview`, `OnHold`, or `Closed`, using the exact values supported by the backend and without adding client-only transition restrictions.
- **FR-016**: A status update MUST support an optional note, submit through the backend, and refresh the displayed status and history only after success.
- **FR-017**: Status history MUST be read-only and display status, date/time, and any note in the order supplied by the backend. The current status MUST agree with the backend's latest history/current-status data.
- **FR-018**: The system MUST provide confirmed deletion with user confirmation, and deletion MUST NOT delete the normalized job or recreate a user interest.
- **FR-019**: The system MUST preserve entered values where practical after recoverable validation or network errors and provide a way to retry failed operations.

### Key Entities

- **Application Journal Entry**: A user's record of pursuing one normalized job. It includes editable recruiter and contact details, the current backend-managed status, creation/update information, and its associated normalized job header.
- **Normalized Job Header**: The backend-owned title, company, location, posting date, and original posting URL associated with an entry; it is displayed by reference and is not duplicated as client-owned journal data.
- **Status History Event**: An immutable record of a status value, its effective date/time, and an optional note explaining the change.
- **Application Listing Query**: The company/title/location filters and page/page-size values used to retrieve a server-filtered result page.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For every successful listing response, the UI displays no more than the returned page size, the returned current page, the total matching count, and the returned ordering without client-side reordering.
- **SC-002**: In automated checks, each supported filter and a combined-filter query are sent to the backend listing operation, and changing filters resets the requested page to 1.
- **SC-003**: In automated checks, a newer query always determines the displayed list even when an earlier request completes later.
- **SC-004**: Users can complete create, edit, and status-update flows with one successful submission each; a pending operation cannot be submitted a second time.
- **SC-005**: In automated checks, creation for an interested job issues no separate interest-removal request, and the user-visible result reflects the backend's response.
- **SC-006**: In automated checks, history displays all returned events in backend order with status, timestamp, and optional note, and provides no history mutation controls.
- **SC-007**: Every tested listing, validation, duplicate, authorization, network, status-update, and deletion failure produces visible error feedback without presenting an unsuccessful operation as successful.

## Assumptions

- Existing authentication and route-guard behavior will be reused.
- The create view will include a normalized-job search/selection control so a user can choose any existing normalized job.
- The UI will consume backend pagination metadata and status/history as authoritative. The backend's supported status values are the values listed in Functional Requirement FR-015.
- Backend field and status serialization will be verified before release; optional dates and notes may be blank and an unset work-authorization discussion remains distinct from a negative response.
- The canonical status values are assumed to be `NotStarted`, `Registered`, `Applied`, `Contacted`, `Screening`, `Interview`, `OnHold`, and `Closed`; labels are user-friendly title case.
- The backend supports deletion because the user confirmed a `DELETE /applications/{application_id}/` operation.
- Date-only values are presented as local dates; event timestamps are formatted using the application's existing date conventions without altering the stored values.
