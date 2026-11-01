# Feature Specification: Job-Specific CV Tailoring

**Feature Branch**: `not created`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Enable an authenticated candidate to tailor a truthful CV from a normalized job or matching report, choosing the job set, tailoring mode, profile version, and output language."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and start CV tailoring (Priority: P1)

As an authenticated candidate, I want to start CV tailoring from a normalized job or matching report and configure the jobs and output options so that the generated CV fits my intended opportunities and preferences. I choose a profile version from job details; a matching-report launch uses the profile version that produced that report.

**Why this priority**: Candidates need control over which opportunities and profile version are used, and whether they want one document per job or one document for a group.

**Independent Test**: Start from a normalized job and from a matching report, configure the job set, profile version, mode, and language, then verify the accepted request uses those exact choices.

**Acceptance Scenarios**:

1. **Given** an authenticated candidate opens an available normalized job, **When** they choose CV tailoring, **Then** the setup starts with that job as its target.
2. **Given** an authenticated candidate opens a matching report, **When** they choose CV tailoring, **Then** the setup offers valid jobs from that report's results for selection and uses no jobs outside that report.
3. **Given** a matching report contains more jobs than the service permits in one request, **When** the candidate configures the request, **Then** they can select no more than 10 jobs and cannot submit an empty or oversized selection.
4. **Given** the candidate configures one or more jobs, **When** they choose a tailoring mode, **Then** `per_job` is selected by default and creates one CV per selected job, while `general` creates one CV tailored to the selected group.
5. **Given** the candidate has selectable profile versions, **When** the setup opens, **Then** a profile version is preselected and the candidate can select another version they own.
6. **Given** setup begins from a matching report, **When** the tailoring request is configured, **Then** it MUST use the profile version associated with that report and the candidate cannot substitute another profile version.
7. **Given** a profile version is selected, **When** the output-language field is initialized or the profile selection changes, **Then** its default matches that profile's output language and the candidate can change it without changing the saved profile.
8. **Given** a valid tailoring setup is submitted, **When** the service accepts it, **Then** the request uses exactly the chosen jobs, profile version, mode, and output language, with cover-letter generation disabled.
9. **Given** no successfully built profile or no valid target job is available, **When** the candidate tries to submit, **Then** generation does not begin, the reason is explained, and an appropriate recovery path is offered.
10. **Given** the candidate starts generation, **When** they activate the action repeatedly while the request is being submitted, **Then** only one generation request is created.
11. **Given** a CV is generated, **When** the candidate reviews it, **Then** its factual claims about skills, experience, education, certifications, and achievements are supported by the selected profile and it does not invent qualifications or history.
12. **Given** the candidate has configured a request, **When** they choose to proceed, **Then** they review the selected jobs, profile, mode, and language and explicitly confirm before generation starts.
13. **Given** the candidate reviews a new or retry request, **When** they remove selected jobs, **Then** only the remaining jobs are submitted and confirmation is blocked if none remain.
14. **Given** a job-based session is in progress, **When** the candidate adds jobs from other normalized job pages, **Then** the workspace retains its selections and settings and allows up to ten distinct jobs.
15. **Given** an incompatible job or matching report is opened, **When** an unfinished session exists, **Then** the candidate chooses whether to keep it or replace it before its contents are discarded.
16. **Given** the candidate opens CV history, **Then** it is displayed separately from the tailoring session workspace.

### User Story 2 - Track and recover CV generation (Priority: P1)

As a candidate waiting for a tailored CV, I want to see whether it is pending, running, completed, or failed and return to the same request later, so that I can tell what happened without accidentally generating duplicates.

**Why this priority**: Generation may take time, and reliable status and recovery are necessary for the workflow to be trustworthy.

**Independent Test**: Exercise every generation state, navigate away and return while processing is active, and verify that the candidate can resume tracking and that failures provide an actionable retry path.

**Acceptance Scenarios**:

1. **Given** generation has been accepted, **When** it is waiting or running, **Then** the candidate sees its current progress state.
2. **Given** generation completes, **When** the completion is received, **Then** the candidate sees a success state and can open the generated CV.
3. **Given** generation fails, **When** the failure is received, **Then** the candidate sees a meaningful error and can retry without the failed attempt being shown as successful.
4. **Given** the candidate leaves while generation is active, **When** they return to the job or CV history, **Then** they can recover the active request and continue tracking it.
5. **Given** status cannot be confirmed temporarily, **When** the candidate checks progress, **Then** the last confirmed state is preserved, the uncertainty is explained, and no new request is submitted automatically.

### User Story 3 - Review and retrieve generated CVs (Priority: P2)

As a candidate, I want to preview and download a completed CV and find previously generated CVs, so that I can use or revisit the version created for a particular job.

**Why this priority**: A generated document is useful only if the candidate can inspect it, retrieve it, and understand which job it targets.

**Independent Test**: Complete a generation, open its preview, download it, and revisit it from history; verify the job association and owner-only access.

**Acceptance Scenarios**:

1. **Given** generation is complete, **When** the candidate opens the result, **Then** the document is previewed when its format is supported and its target job is clearly identified.
2. **Given** a completed CV is available, **When** the candidate chooses download, **Then** the generated document is downloaded and remains associated with its target job.
3. **Given** the candidate opens CV history, **When** prior documents exist, **Then** each available item identifies its target job and can be reopened or downloaded.
4. **Given** the candidate has no prior CVs, **When** they open CV history, **Then** a clear empty state explains how to start tailoring from a normalized job.
5. **Given** a document cannot be previewed or retrieved, **When** the candidate opens it, **Then** the client explains the problem and offers download or retry when supported.

### Edge Cases

- The candidate's profile is missing, still being built, failed to build, or no longer has usable content; generation must not start with an invalid profile.
- A selected job is deleted or becomes unavailable before the request can be submitted or completed.
- The candidate's profile or selected job becomes unavailable while a request is being submitted or processed; generation must fail clearly without substituting a different context.
- A matching report contains no usable job IDs, duplicate job IDs, or more valid jobs than can be submitted at once; only distinct valid report jobs can be selected and the request never exceeds the service limit.
- The matching report's profile version is missing, deleted, or no longer available; tailoring from that report is blocked and the candidate is told how to recover without substituting another profile.
- A candidate changes profile version or output language; the request uses the final values shown at submission and does not change saved profile data.
- The candidate switches tailoring mode; the document count follows the selected mode and target-job count.
- Generation remains pending or running after navigation or a page reload; returning must not create another request.
- The backend returns an unknown state, temporarily cannot provide status, or returns a failure without a useful detail; retain the last confirmed state and show a useful recovery action.
- The generated document has an unsupported preview format or its download link is expired or unavailable.
- CV history is empty or contains records whose job details are no longer available; keep the record accessible and identify the missing job context clearly.
- A candidate attempts to access a CV belonging to another user; the document and its metadata must not be exposed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an authenticated candidate start CV tailoring from either a normalized job detail or a matching report.
- **FR-002**: From a normalized job detail, the system MUST target that job. From a matching report, it MUST let the candidate select 1–10 valid jobs present in that report and MUST NOT include jobs from another source.
- **FR-003**: The system MUST prevent submission when no successfully built profile version or no valid target job is available, explain the reason, and provide an appropriate recovery path.
- **FR-004**: When starting from normalized job details, the system MUST let the candidate choose among their available profile versions and submit the selected profile ID. When starting from a matching report, the system MUST use the profile version associated with that report and MUST NOT allow another profile version to be substituted.
- **FR-005**: The system MUST offer `per_job` and `general` tailoring modes, default to `per_job`, create one CV per selected job in `per_job` mode, and create one CV for the selected group in `general` mode.
- **FR-006**: The system MUST default the output-language field to the selected profile version's output language, allow the candidate to change it before submission, and MUST NOT update the profile when the language is changed.
- **FR-007**: The system MUST submit exactly the selected job IDs, profile version, mode, and output language. It MUST disable cover-letter generation for this feature.
- **FR-008**: A generated CV MUST be based on facts in the selected profile and relevant job information. It MUST NOT invent skills, work experience, achievements, certifications, education, or other qualifications.
- **FR-009**: The system MUST show supported generation states, including pending, running, completed, and failed where provided by the service, and MUST distinguish an unknown or temporarily unavailable state from success or failure.
- **FR-010**: The system MUST let the candidate recover an active generation after navigating away or returning later without submitting a duplicate request.
- **FR-011**: The system MUST prevent repeated activation during submission or active generation from creating accidental duplicate CV requests for the same selected job set and profile version.
- **FR-012**: On successful completion, the system MUST provide access to generated CVs and preserve their association with the authenticated candidate, selected profile version, and selected job set.
- **FR-013**: The system MUST provide a preview when the generated document format is supported and a download action when the document is available.
- **FR-014**: The system MUST let candidates access previously generated CVs when history is available, with each request and document identifying its profile version, mode, and target job or jobs.
- **FR-015**: The system MUST restrict profile selection, tailoring request metadata, and generated document access to the authenticated candidate.
- **FR-016**: The system MUST show clear loading, success, empty, and error states and provide meaningful recovery actions for profile loading, job selection, submission, status, preview, and download failures.
- **FR-017**: A retry after a confirmed failure MUST create a new attempt only after explicit candidate action; temporary status uncertainty MUST NOT trigger an automatic resubmission.
- **FR-018**: This feature MUST NOT submit job applications, generate cover letters, or automatically change the candidate's unified profile.
- **FR-019**: Before starting a new generation or retry, the system MUST show a review of the jobs, profile, mode, and output language, permit removing jobs, and require explicit confirmation. It MUST prevent confirmation when no jobs remain.

### Key Entities *(include if feature involves data)*

- **Candidate profile context**: The successfully built profile belonging to the authenticated candidate and used to ground the generated CV.
- **Profile version**: One candidate-owned saved profile, including its identifier, label, default status, and output language.
- **Normalized job set**: One selected normalized job or a distinct set of 1–10 jobs selected from a matching report.
- **Tailoring configuration**: The selected job set, profile version, mode (`per_job` or `general`), and output language.
- **Matching report**: A candidate-owned report that supplies eligible normalized job IDs and the required profile version for report-based tailoring setup.
- **CV generation request**: A candidate-owned attempt to generate CV documents for the selected job set and profile version, with mode, language, and lifecycle state.
- **Tailored CV**: A completed document produced for a selected profile version and one job or a selected job group, with metadata needed to preview, download, and revisit it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of candidates with a successfully built profile can configure and start tailoring from a normalized job or matching report in under two minutes during usability testing.
- **SC-002**: 100% of accepted requests use exactly the selected job set, profile version, mode, and output language, and no request starts without an available selected profile and valid job set.
- **SC-003**: 100% of test requests in `per_job` mode produce one CV per selected job, while `general` mode produces one CV for the selected job group.
- **SC-004**: 100% of accepted requests reach a clearly communicated supported terminal outcome or remain visibly recoverable when status cannot be confirmed.
- **SC-005**: 100% of completed CV records shown to a candidate identify their profile version and target job or job group and can be previewed when supported or downloaded when available.
- **SC-006**: In factual-content review, every claim about candidate qualifications, experience, skills, achievements, or credentials in a generated CV is supported by the selected profile; no unsupported claim is presented as fact.
- **SC-007**: Candidates can find and reopen or download a previous CV from available history without starting a new generation.

## Assumptions

- Authentication, normalized job details, and candidate profile building are existing workflows; this feature reuses them without changing their behavior.
- A profile is considered ready when a successful build has produced usable profile data for the authenticated candidate. The existing profile workflow remains the source of readiness and profile content.
- A completed CV can be previewed when the generated format permits it; otherwise, the user receives a download option if the document is available.
- The backend already lists candidate-owned profile versions and exposes their labels, default state, and output language. Profile versions are selectable only for the authenticated candidate when starting from normalized job details.
- The backend tailoring request accepts 1–10 job IDs, a selected profile ID, `per_job` or `general` CV mode, output language, and optional cover-letter settings. The client always disables cover letters.
- The client defaults to `per_job` and the selected profile's output language. Candidates may change either before submission; changing language does not update the profile.
- Starting from a matching report offers only that report's valid job results and uses only the profile version associated with that report. If that profile is unavailable, the candidate must not be silently switched to another profile.
- The backend preserves selected job IDs and profile ID, tracks request/document status, and provides history and authenticated Markdown downloads. No backend contract change, document-generation service, or storage infrastructure is required.
- A request may include at most 10 distinct jobs, matching the existing API limit. Automatic job applications, cover letters, and profile updates are out of scope.
