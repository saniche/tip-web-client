# Feature Specification: Normalized Job Details

**Feature Branch**: `not created`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "A new page to display the details of a normalized job. Users can select a job from the normalized listing to view its details. Users with write access can delete the job or update its header details (company, location, salary, and source). The page accepts a job ID and retrieves details from the server. The detail record includes id, url, title, company, location, salary, source, posting_date, summary, key_responsibilities, requirements, desirables, tools_and_technologies, additionals, status, submitter_id, created_at, and has_write_access. The source URL is not clickable when the source is email."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View a normalized job's details (Priority: P1)

As a user browsing normalized jobs, I want to open a job's detail page so that I can review the full posting before deciding what to do next.

**Why this priority**: Viewing a complete posting is the core purpose of the feature and is useful to every user who can access the listing.

**Independent Test**: Select a job from the normalized listing and verify that the detail page shows the selected job's complete record, status, and available source link.

**Acceptance Scenarios**:

1. **Given** a job is shown in the normalized listing, **When** a user opens that job, **Then** the page displays details for that job, including its title, company, location, salary, source, posting date, summary, key responsibilities, requirements, desirables, technical stack, additionals, status, submitter, and creation date.
2. **Given** a job has a source URL and its source is not email, **When** a user views its details, **Then** the URL is presented as a link that opens the source.
3. **Given** a job's source is email, **When** a user views its details, **Then** its source URL is not presented as a clickable link.
4. **Given** a job is still processing, completed, or failed, **When** a user views its details, **Then** the current status is clearly shown.
5. **Given** the requested job does not exist or its details cannot be loaded, **When** the page finishes loading, **Then** the user sees a clear unavailable or load-error message and can return to the listing or retry when appropriate.

### User Story 2 - Update permitted header details (Priority: P2)

As a user with write access to a job, I want to update its company, location, salary, or source so that I can correct or maintain its key listing information.

**Why this priority**: Keeping key listing information accurate improves the usefulness of normalized jobs, while limiting edits to authorized users protects job data.

**Independent Test**: Open a job with write access, edit each permitted field, save, and verify the updated values appear; repeat without write access and verify editing is unavailable.

**Acceptance Scenarios**:

1. **Given** the server indicates that the current user has write access, **When** the user views the job, **Then** they can edit company, location, salary, and source, but cannot edit other job details.
2. **Given** a user has changed one or more permitted fields, **When** they save valid changes successfully, **Then** the detail page shows the saved values.
3. **Given** a user has changed permitted fields, **When** they cancel editing, **Then** the unsaved changes are discarded and the previously saved values remain.
4. **Given** a save fails, **When** the user is notified, **Then** the page does not present the change as saved and the user can retry without losing their entered values.
5. **Given** the server indicates that the current user does not have write access, **When** the user views the job, **Then** edit controls are unavailable and the displayed values remain read-only.

### User Story 3 - Delete a permitted job (Priority: P2)

As a user with write access to a job, I want to delete it when it should no longer be available so that the listing stays accurate.

**Why this priority**: Removing an obsolete or incorrect job is an important maintenance action, but viewing details remains useful without it.

**Independent Test**: Open a job with write access, confirm its deletion, and verify the page returns to the listing and the job is no longer available; verify that a user without write access cannot delete it.

**Acceptance Scenarios**:

1. **Given** the server indicates that the current user has write access, **When** the user requests deletion, **Then** the page asks the user to confirm before deleting the job.
2. **Given** the user confirms deletion and it succeeds, **When** the operation completes, **Then** the user returns to the normalized listing and the deleted job is no longer available.
3. **Given** the user cancels the deletion confirmation, **When** the confirmation closes, **Then** the job remains unchanged and the user stays on its detail page.
4. **Given** a deletion fails, **When** the user is notified, **Then** the job remains available and the user can retry.
5. **Given** the server indicates that the current user does not have write access, **When** the user views the job, **Then** deletion controls are unavailable.

### Edge Cases

- A job ID is missing, invalid, or refers to a job that has been removed; show a clear unavailable state rather than unrelated or stale details.
- The detail service fails or returns incomplete data; identify unavailable values with a consistent placeholder and communicate load failures.
- Optional text, lists, or dates are blank or absent; keep the rest of the job readable and show a consistent placeholder for missing values.
- A job changes or is deleted while its details are open; do not show a successful update or deletion unless the operation succeeds.
- A user's write-access value is false; do not offer any edit or delete action.
- The source denotes email, regardless of letter case; show the source URL as plain text or omit its link affordance.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The page MUST open the job selected from the normalized listing and retrieve the details for that job using its identifier.
- **FR-002**: The page MUST display the job's identifier, title, company, location, salary, source, posting date, summary, key responsibilities, requirements, desirables, technical stack, additionals, status, submitter identifier, and creation date.
- **FR-003**: When the job has a source URL and its source is not email, the page MUST provide a link to that URL. When the source is email, the URL MUST NOT be clickable.
- **FR-004**: The page MUST clearly distinguish the processing, completed, and failed job statuses.
- **FR-005**: The page MUST use the job's server-provided write-access permission to determine whether the current user can edit or delete the job.
- **FR-006**: A user with write access MUST be able to update only the company, location, salary, and source fields.
- **FR-007**: The page MUST indicate when an update succeeds and show the saved values. If an update fails, it MUST communicate the failure and preserve the user's entered values for retry.
- **FR-008**: A user with write access MUST be able to request deletion, but the page MUST require confirmation before deleting the job.
- **FR-009**: After successful deletion, the page MUST return the user to the normalized listing. If deletion fails, it MUST communicate the failure and keep the job available.
- **FR-010**: Users without write access MUST NOT be offered usable edit or delete controls.
- **FR-011**: The page MUST provide clear loading, unavailable-job, and load-error states; a load error MUST offer a retry action.
- **FR-012**: Missing or blank optional values MUST NOT prevent the page from displaying the rest of the job details.

### Key Entities _(include if feature involves data)_

- **Normalized job detail**: One normalized posting identified by a job ID, including its source URL, title, company, location, salary, source, posting date, summary, key responsibilities, requirements, desirables, technical stack (a list of strings), additionals (a list of strings), processing status, submitter ID, creation date, and current user's write-access permission.
- **Editable header details**: The company, location, salary, and source values of a normalized job. These are the only fields a user with write access can change through this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of representative users can open a selected job and find its requested detail within 30 seconds.
- **SC-002**: In acceptance testing, 100% of displayed detail pages show every available field in the job record, including status and write-access-specific actions.
- **SC-003**: In permission tests, 100% of users without write access are unable to edit or delete a job through the detail page.
- **SC-004**: In update and deletion acceptance tests, 100% of successful operations show the resulting state, and 100% of failed operations are clearly reported without being presented as successful.

## Assumptions

- The normalized job listing already exists and remains the entry point to the detail page; opening a listing item passes that item's identifier.
- The server supplies the job detail record and the current user's write-access permission. The permission value is authoritative for whether editing and deletion are available.
- The source value identifies email without regard to letter case.
- Only company, location, salary, and source are editable; the title and all other returned details are read-only in this feature.
- The user must explicitly confirm deletion. Successful deletion returns the user to the normalized listing.
- A consistent placeholder is used for blank optional values. A load failure can be retried; a missing or removed job is shown as unavailable.
- The detail record can be in processing, completed, or failed status while remaining viewable.
