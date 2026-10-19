# Feature Specification: Normalize Job Submission

**Feature Branch**: `003-normalize-job`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Normalize Job page, to send content to server for normalization. Link from dashboard and normalized jobs listing. Endpoint: POST /jobs/normalize { url, content } returns job record with processing_job_id. Normalization is asynchronous; client polls GET /processing-jobs/{id} (status: pending | processing | completed | failed). User can send another request while previous ones are processing, sees a loading spinner until completion/failure, gets an error message on failure, may leave the page at any time, can see all normalization jobs later from the dashboard and return to any job, and sees the number of normalization tasks currently in progress."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Job Content for Normalization (Priority: P1)

A user on the Normalize Job page enters (or has prefilled) a job posting URL and its raw content, then submits it for normalization. The system immediately displays a loading indicator and keeps the user informed as the request moves through processing. When normalization completes, the user sees a success outcome with access to the normalized result; when it fails, the user sees a clear error message.

**Why this priority**: This is the core value of the feature — without the ability to submit content and receive feedback, no other part of the feature matters.

**Independent Test**: Can be fully tested by navigating to the Normalize Job page, submitting a URL and content, and observing the spinner, the eventual completed or failed state, and (on success) a link to the resulting normalized job. Delivers value on its own as a working submission flow.

**Acceptance Scenarios**:

1. **Given** the user is on the Normalize Job page with a valid URL and content entered, **When** the user submits the request, **Then** the system sends the content to the server (with the content serialized as a JSON string to avoid parsing errors) and displays a loading spinner.
2. **Given** a normalization request has been submitted and is still being processed, **When** the server reports an in-progress status (pending or processing), **Then** the spinner remains visible and the user is not blocked from other actions.
3. **Given** a normalization request has been submitted, **When** the server reports completion, **Then** the spinner is hidden and the user is shown the normalized job (or a link to it).
4. **Given** a normalization request has been submitted, **When** the server reports failure, **Then** the spinner is hidden and a clear error message is displayed.
5. **Given** the user is on the Normalize Job page, **When** the user attempts to submit with missing or invalid input (e.g., empty URL or empty content), **Then** submission is prevented and the user is told what to correct.

---

### User Story 2 - Submit Multiple Requests Concurrently (Priority: P2)

A user can submit a new normalization request while one or more previous requests are still processing. Each in-flight request shows its own status independently, so the user can queue up several normalizations without waiting.

**Why this priority**: Batch work is a common real-world pattern when importing job postings; blocking on one slow normalization would materially hurt productivity.

**Independent Test**: Can be fully tested by submitting two or more requests in quick succession and verifying each tracks its own progress, spinner, and final outcome independently.

**Acceptance Scenarios**:

1. **Given** one normalization request is still processing, **When** the user submits another request, **Then** the new request is accepted and both are tracked independently.
2. **Given** multiple requests are in flight, **When** one completes or fails, **Then** only that request's indicator and outcome change; the others continue unaffected.

---

### User Story 3 - Track Normalization Jobs from the Dashboard (Priority: P3)

A user can reach the Normalize Job page from the dashboard and from the normalized jobs listing. The dashboard shows all normalization jobs the user has started, including a visible count of how many are currently in progress, and lets the user return to any job to see its status or result — even after leaving the page or closing the browser and coming back later.

**Why this priority**: Discoverability and continuity matter, but the feature already delivers value with submission alone; tracking makes it dependable for ongoing work.

**Independent Test**: Can be fully tested by starting a normalization, leaving the page, returning via the dashboard, and verifying the job appears in the list with its current status and the in-progress count is accurate.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** the user selects the normalize action, **Then** the user is taken to the Normalize Job page.
2. **Given** the user is on the normalized jobs listing, **When** the user selects the normalize action, **Then** the user is taken to the Normalize Job page.
3. **Given** the user has previously submitted normalization requests, **When** the user views the dashboard, **Then** the dashboard lists those jobs with their statuses and shows the number currently in progress.
4. **Given** a normalization job appears in the dashboard list, **When** the user selects it, **Then** the user is taken to that job's detail or result view with its latest status.
5. **Given** a normalization request is processing, **When** the user leaves the page and later returns (same or different session), **Then** the job's latest status is reflected and, if still processing, progress resumes displaying.

### Edge Cases

- What happens when the server returns no processing job identifier (nothing to poll)? The submission is treated as complete or failed based on the returned job status, without entering a polling loop.
- What happens when polling encounters a network error? The system retries or surfaces a recoverable "checking status failed" message without losing track of the job; the user can retry.
- What happens when the user leaves the page mid-processing? No data is lost; the job continues server-side and its latest status is shown when the user returns via the dashboard or the list.
- What happens if the user closes the browser and returns after the job finished? The final status (completed with result, or failed with error) is shown.
- What happens when a job stays in progress for an unusually long time? The user is not stuck on an infinite spinner without recourse; status continues to be checkable from the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Normalize Job page where users can submit a job posting URL and its raw content for normalization.
- **FR-002**: The system MUST send the submitted content to the server with the content serialized as a JSON string, to avoid parsing errors on the server.
- **FR-003**: The system MUST treat normalization as asynchronous: after submission, the system MUST track the processing status returned by the server until it reaches a completed or failed state.
- **FR-004**: While any normalization request is in progress, the system MUST display a loading spinner tied to that request.
- **FR-005**: When a normalization request fails, the system MUST hide the spinner and display a clear error message.
- **FR-006**: When a normalization request completes, the system MUST hide the spinner and surface the resulting normalized job (or a link to it).
- **FR-007**: The system MUST allow users to submit additional normalization requests while previous requests are still processing, tracking each independently.
- **FR-008**: The system MUST allow users to leave the Normalize Job page at any time without losing submitted work; in-progress jobs MUST continue to be tracked server-side.
- **FR-009**: The dashboard MUST provide a link to the Normalize Job page.
- **FR-010**: The normalized jobs listing MUST provide a link to the Normalize Job page.
- **FR-011**: The dashboard MUST display all normalization jobs the user has submitted, with their current statuses, and MUST allow returning to any listed job.
- **FR-012**: The dashboard MUST display the number of normalization tasks currently in progress.
- **FR-013**: The system MUST prevent submission when required input (URL or content) is missing, and inform the user what must be corrected.
- **FR-014**: The system MUST reflect the latest known status of a previously submitted job when the user returns to it, resuming progress display if the job is still processing.

### Key Entities *(include if feature involves data)*

- **Normalization Job**: A user's request to normalize a job posting. Key attributes: identifier, status, associated processing job identifier (may be absent), resulting title (may be absent until processed), source URL, creation date.
- **Processing Job**: The server-side asynchronous task performing the normalization. Key attributes: identifier, status (pending, processing, completed, failed), result identifier (present when completed), error description (present when failed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a normalization request and see confirmation of acceptance (spinner visible) within 1 second of submitting.
- **SC-002**: 100% of completed or failed normalizations produce a visible outcome (result access or error message) without requiring the user to refresh or leave and return.
- **SC-003**: Users can have at least 5 normalization requests in flight simultaneously, each tracked independently without cross-interference.
- **SC-004**: Users who leave the page mid-processing can recover full status of every submitted job on return, with zero lost submissions.
- **SC-005**: The dashboard in-progress count accurately reflects the number of unfinished normalization tasks at all times (matching actual pending/processing jobs within one status-refresh interval).
- **SC-006**: 95% of users successfully complete their first normalization submission without assistance.

## Assumptions

- Users are authenticated; normalization jobs are scoped to the submitting user (consistent with existing dashboard and listing features).
- A server endpoint exists (or is delivered alongside this feature) to list the user's normalization jobs with their statuses, enabling dashboard tracking and in-progress counts; status shown after leaving and returning comes from the server rather than client memory.
- Polling cadence and timeout behavior follow standard client-side conventions (e.g., poll every few seconds with backoff); exact intervals are an implementation detail.
- Input validation is minimal (non-empty URL and content); deeper content validation is the server's responsibility.
- The normalized jobs listing and dashboard already exist from prior features; this feature adds links and normalization-job visibility to them rather than rebuilding them.
- "Return to any job" means navigating to the existing normalized job detail view when a result exists, or to a status view of the normalization job when it does not.
