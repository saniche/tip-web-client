# Feature Specification: Matching Sessions and Reports

**Feature Branch**: Not created by the specification command

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Build a frontend workflow for assembling jobs from Normalized Jobs and My Interests into a matching session, confirming and submitting the selection against the current user's built profile, tracking processing, and viewing current and previous matching reports. Reuse existing frontend architecture and backend capabilities. Preserve job normalization; exclude CV tailoring and backend changes."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Assemble and submit a matching session (Priority: P1)

As an authenticated user, I want to collect jobs from Normalized Jobs and My Interests into one reviewable session, so I can choose which jobs to match against my built profile before any matching work begins.

**Why this priority**: This is the central workflow and the prerequisite for submitting a useful matching request.

**Independent Test**: Add jobs from each source, combine them, review and edit the selection, then confirm once. Verify repeated job IDs appear once and no matching work starts before confirmation.

**Acceptance Scenarios**:

1. **Given** there is no active session, **When** the user starts one from either supported job source, **Then** the same matching-session workflow opens.
2. **Given** a session is open, **When** the user adds jobs from either or both sources, **Then** the selection displays available job details and source, and each job ID appears at most once.
3. **Given** an open session, **When** the user adds or removes jobs, **Then** the selection changes without adding jobs to My Interests or starting matching.
4. **Given** an open session with selected jobs, **When** the user reviews it, **Then** the review shows the count, available title and company, source, current interest membership, and the jobs that need to be added to interests.
5. **Given** a session is empty, exceeds a confirmed matching limit, or the user has no built profile, **When** the user reviews it, **Then** confirmation is unavailable with an explanation; if the profile is missing, the user can navigate to profile creation.
6. **Given** a non-empty session is open, **When** the user chooses to discard it, **Then** the user must confirm before the selection is discarded.
7. **Given** a session is open, **When** the user navigates away or reloads, **Then** the session can be resumed; starting another session offers resuming the existing one or explicitly discarding it.
8. **Given** a session is submitting or processing, **When** the user tries to edit, discard, or start another session, **Then** those actions are unavailable.

### User Story 2 - Track matching and recover from outcomes (Priority: P1)

As a user who has confirmed a selection, I want to see the matching operation's progress and a clear result, so I know whether matching completed and can recover from failures without repeating successful work.

**Why this priority**: Users need reliable feedback after submission and must not mistake network or report-loading failures for matching outcomes.

**Independent Test**: Exercise accepted submissions in waiting, running, completed, failed, unknown-status, and polling-error conditions. Verify state transitions, recovery actions, and report retrieval without duplicate submissions.

**Acceptance Scenarios**:

1. **Given** the user confirms a valid session, **When** jobs are not already in My Interests, **Then** they are added using the existing interest-management behavior before matching is submitted, and interest data is refreshed afterward.
2. **Given** some jobs cannot be added to My Interests, **When** the submission workflow continues, **Then** those jobs are shown as not submitted with their errors and are excluded; other jobs continue when the existing service permits independent handling.
3. **Given** every selected job fails the required interest-add operation, **When** preparation ends, **Then** no matching submission occurs and the session returns to an editable state with actionable errors.
4. **Given** the user confirms a valid selection, **When** submission is accepted, **Then** one matching operation is created for all eligible jobs, its identifiers are retained, and repeated confirmation does not create another operation.
5. **Given** the submission is waiting or running, **When** its state is refreshed, **Then** the user sees the corresponding progress and tracking continues for that submission, not for individual jobs.
6. **Given** processing reaches `done` or `failed`, **When** the outcome is received, **Then** tracking stops and the session closes automatically with a summary of the outcome.
7. **Given** processing returns an unrecognized state or a temporary tracking error, **When** the status cannot be confirmed, **Then** the last confirmed state is preserved, the user sees a recovery path, and the session is not marked successful or failed.
8. **Given** processing completes but the report is missing or cannot be loaded, **When** the session closes, **Then** the user sees that processing completed but the report is unavailable and can retry report retrieval without resubmitting matching.
9. **Given** the user leaves and returns while processing is active, **When** the session resumes, **Then** tracking continues from the retained submission identifier without overlapping or duplicate tracking.
10. **Given** a matching submission failed or the user must retry selected jobs, **When** the user starts a retry, **Then** a new editable session is pre-filled only with jobs that did not succeed, including jobs not submitted, and the user must review and confirm it.
11. **Given** the matching submission itself fails before acceptance, **When** the session returns to an editable state, **Then** recoverable information and errors are retained and no uncertain accepted operation is automatically repeated.

### User Story 3 - View and manage matching reports (Priority: P2)

As a user, I want to browse prior matching reports and inspect their own results, so I can compare outcomes over time and manage reports independently of an active session.

**Why this priority**: Report history provides lasting value after each matching operation and is independent of the session lifecycle.

**Independent Test**: Open report history with empty and populated results, open a report, verify result presentation and fallbacks, then delete a terminal report and confirm it disappears without affecting interests.

**Acceptance Scenarios**:

1. **Given** the user opens report history, **When** reports exist, **Then** the list shows available creation date, status, and profile-version metadata without requiring details for every report.
2. **Given** no reports exist, **When** the user opens report history, **Then** a clear empty state is displayed.
3. **Given** the user opens a report, **When** its details are available, **Then** only that report's results are shown, with job title and company where available and a job-identifier fallback otherwise.
4. **Given** a result follows the current supported explanation format, **When** it is displayed, **Then** the system eligibility check is distinct from narrative analysis, requirements and desirables retain their order and show their judgments and evidence, and notes and each analysis section are shown when present.
5. **Given** a result has a null score, **When** it is displayed, **Then** it is labeled "Not scored" and is never presented as a numeric zero or perfect score.
6. **Given** report results include ranking information, **When** they are displayed, **Then** they follow the report's rank order, with unranked or unscored results last; no score or rank is recalculated.
7. **Given** a result uses an older, incomplete, or unexpected explanation format, **When** it is displayed, **Then** it uses a simplified, read-only legacy presentation and does not fabricate criteria, evidence, judgments, scores, or analysis.
8. **Given** a report has no results or cannot be retrieved, **When** the user opens it, **Then** an appropriate empty or recoverable error state is displayed without repeating matching.
9. **Given** a report has a profile-version identifier, **When** the current profile identifier is also available and meaningfully comparable, **Then** the user can distinguish an older profile version; otherwise no unsupported latest/older claim is made.
10. **Given** a report is eligible for deletion, **When** the user requests deletion, **Then** they confirm permanent removal, successful deletion refreshes history and exits the deleted detail, and a failed deletion leaves the report available with an error.
11. **Given** a report is still processing or tracked by the active session, **When** the user views its actions, **Then** deletion is unavailable until the restriction no longer applies.
12. **Given** the user deletes a report or dismisses a session, **When** the change completes, **Then** My Interests and normalized job data remain unchanged and report history remains independent of session state.
13. **Given** the user opens an older report, **When** they view its details, **Then** they see that report's own results and a repeated match remains available as a separate report.

### Edge Cases

- The built profile becomes unavailable between review and confirmation.
- A matching-size limit is unknown, exceeded, or rejected during submission.
- Interest data is stale, an add operation reports an already-present job, or individual additions fail.
- The matching request fails or times out with uncertainty about whether it was accepted.
- Processing returns an unknown status, or polling fails after a previously confirmed status.
- A terminal response is received immediately, without a need to continue tracking.
- A completed process has no report identifier, or its report is temporarily inaccessible.
- Session state contains incomplete or stale identifiers after navigation or reload.
- A report was deleted elsewhere, has no results, contains null scores or ranks, or uses legacy/unexpected result data.
- Job metadata cannot be resolved for a report result.
- A report is still processing or belongs to the active session when deletion is requested.
- Retry eligibility cannot be established from the existing report data; in that case the user is not told that an unverified job succeeded or failed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to start and continue one matching session using jobs from Normalized Jobs, My Interests, or both.
- **FR-002**: The session MUST contain no duplicate job identifiers and MUST allow users to add and remove jobs while the session is editable.
- **FR-003**: Adding or removing a job in a session MUST NOT itself change My Interests or begin matching.
- **FR-004**: The session MUST preserve its editable selection through navigation and reload, and retain active processing identifiers and submitted job identifiers while processing. The session MUST be cleared when discarded or closed.
- **FR-005**: Users MUST be able to review the job count, available job information and source, interest membership, and required interest additions before confirming.
- **FR-006**: Review MUST disclose existing matching information only when it is supported by already-loaded data reliably associated with the job; it MUST NOT load every report's details solely to make such claims.
- **FR-007**: Confirmation MUST be unavailable when the selection is empty, exceeds a verified submission limit, or the user lacks a built profile. The missing-profile state MUST provide a path to profile creation.
- **FR-008**: The application MUST re-check profile availability at confirmation and explain if the profile has become unavailable.
- **FR-009**: On confirmation, jobs known to be absent from My Interests MUST be added using existing behavior before matching. Jobs already known to be in interests MUST NOT be added again. Interest data MUST be refreshed after this phase, including when matching is not subsequently accepted.
- **FR-010**: A job whose required interest addition fails MUST be excluded from matching and shown as not submitted with its error. The application MUST continue with other jobs when existing service behavior permits independent additions.
- **FR-011**: When all selected jobs fail the required interest addition, the application MUST NOT submit matching and MUST return the session to an editable state with actionable errors.
- **FR-012**: One confirmation MUST create no more than one matching submission for all eligible jobs. If a verified limit is exceeded, confirmation MUST be blocked rather than silently splitting the selection into multiple reports.
- **FR-013**: The application MUST prevent repeated confirmation from creating duplicate requests and MUST distinguish a rejected submission from an accepted submission whose response or subsequent tracking is uncertain. It MUST NOT automatically repeat an operation that may have been accepted.
- **FR-014**: The application MUST track the matching submission as one process, preserve its last confirmed state and identifiers, and MUST NOT present per-job processing states.
- **FR-015**: The user MUST be shown waiting and in-progress states while processing is active. Confirmed completion and confirmed failure MUST stop tracking and close the session automatically.
- **FR-016**: An unrecognized processing state or temporary tracking error MUST preserve the last confirmed state, provide a recovery path, and MUST NOT be represented as success or failure.
- **FR-017**: When processing completes, the application MUST retrieve the associated report when its identifier is available. A missing or unavailable report MUST be reported separately from processing success and MUST be reloadable without repeating matching.
- **FR-018**: Leaving the workflow MUST stop active tracking without closing the session; returning MUST resume tracking for a non-terminal operation without duplicate or overlapping requests.
- **FR-019**: A closed session summary MUST distinguish completed and failed submissions, not-submitted jobs, per-result scoring outcomes when report data is available, and completed processing whose report could not be retrieved.
- **FR-020**: Retry MUST create a new editable session containing jobs not submitted or not successfully scored according to verified report semantics. Jobs established as successful MUST NOT be pre-filled. Retry MUST require review and explicit confirmation.
- **FR-021**: Users MUST be able to view matching-report history independently of session state. The list MUST show the available report date, status, and profile-version metadata, and MUST show an empty state when no reports are available.
- **FR-022**: Opening a report MUST show that report's own results without enriching the history list by fetching each report's details.
- **FR-023**: Report results MUST show available job title and company, with a safe job-identifier fallback when job information is unavailable.
- **FR-024**: Current-format results MUST show the score without recalculation, label null scores as "Not scored", keep system eligibility distinct from narrative analysis, and show available requirements, desirables, judgments, evidence, notes, and analysis in their original order.
- **FR-025**: Chance-of-success content MUST be presented only as the report's qualitative text. The application MUST NOT invent a probability, matching criterion, evidence, judgment, or explanation.
- **FR-026**: Results MUST follow available rank ordering, with null or missing rank or score last. The application MUST NOT calculate or alter backend scores or ranks, or rank results across reports.
- **FR-027**: Legacy, incomplete, or unexpected results MUST use a simplified read-only presentation and MUST NOT be misrepresented as the current format.
- **FR-028**: Report deletion MUST require confirmation of permanent removal, MUST be unavailable while the report is non-terminal or tracked by the active session, and MUST leave the report intact and show an error if deletion fails.
- **FR-029**: After successful deletion, history MUST refresh and an open deleted detail MUST be exited. Deletion MUST NOT affect interests or normalized job data.
- **FR-030**: Repeated matching of a job MUST be permitted, and prior reports MUST remain unchanged and independently viewable.
- **FR-031**: The application MUST identify an older profile version only when both identifiers are available and meaningfully comparable; it MUST NOT claim a report uses the latest profile without sufficient evidence.
- **FR-032**: The implementation MUST use only existing frontend and backend capabilities verified during implementation. Unverified response fields, status values, batch limits, and behaviors MUST NOT be invented; unresolved contract gaps MUST be documented.
- **FR-033**: The feature MUST NOT change job normalization, add backend endpoints or data models, introduce a separate matching-history entity, or add CV-tailoring functionality.
- **FR-034**: Existing authentication and navigation behavior MUST remain functional.
- **FR-035**: Relevant frontend behavior MUST be covered using the project's established test practices and fixtures based on verified service contracts.

### Key Entities _(include if feature involves data)_

- **Matching session**: A user's temporary selection of jobs, with an editable, submitting, processing, or closed lifecycle; includes recoverable process and report references while active.
- **Selected job**: A job included in a session, identified uniquely and associated with available title, company, source, and interest membership.
- **Matching submission**: One confirmed operation for all eligible selected jobs, with a process status, possible report reference, and recoverable errors.
- **Matching report**: A persistent result of one matching submission, with creation date, status, and profile-version metadata where available.
- **Report result**: A job-specific result in a report, with available score, system eligibility, scoring status, rank, breakdown, and explanation; legacy results may have a different shape.
- **Profile version**: The built user profile used for a matching submission and identified by a version identifier when exposed by existing services.
- **Interest membership**: Whether a job is already included in the user's My Interests collection.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, users can create a mixed-source session, deduplicate selections, review them, and identify required interest additions in every tested scenario.
- **SC-002**: For each confirmation, no more than one matching submission is created, and no matching operation starts before explicit confirmation.
- **SC-003**: In all tested terminal and non-terminal cases, only confirmed completion or failure closes a session; polling errors and unknown states never produce a false terminal outcome.
- **SC-004**: Every selected job is accounted for in the submission summary as submitted, not submitted with a reason, or excluded from retry because successful work is established.
- **SC-005**: For all tested current-format results, displayed score, rank, eligibility, evidence, and explanations match the report data without recalculation or fabricated content.
- **SC-006**: For all tested legacy or malformed results, the user can still view the report in a simplified state without fabricated current-schema details.
- **SC-007**: Users can open and manage an existing report without changing its prior results, other reports, My Interests, or normalized job data.
- **SC-008**: At least 90% of participants in usability validation can identify the session's next action and distinguish a processing failure from a temporary tracking or report-loading problem without assistance.

## Assumptions

- Users are authenticated and can access the existing Normalized Jobs, My Interests, and profile-building experiences.
- Existing services provide matching submission, process tracking, report listing, report retrieval, report deletion, interest management, and profile information; their exact contracts and capabilities must be verified before implementation.
- The existing backend remains authoritative for matching status, scoring, rank, eligibility, report content, and profile-version metadata.
- A built profile is required to confirm a matching session.
- Jobs and reports remain owned and access-controlled under existing application authentication behavior.
- Session state is temporary frontend workflow data; report history is persistent and independent of it.
- Any batch limit, pagination, ordering, legacy schema, or retry classification is used only when confirmed by existing service contracts or behavior.
- If report data or service behavior cannot establish an outcome reliably, the interface presents the limitation rather than guessing.
- Implementation will first inspect the existing frontend architecture, relevant screens, tests, and backend contracts, then summarize verified findings and the implementation approach before making changes.
- The feature is limited to frontend matching workflow and does not change normalization, matching algorithms, backend models or endpoints, or CV tailoring.
