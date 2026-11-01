# Feature Specification: Optional Cover Letters in Tailoring Sessions

**Feature Branch**: Not created (no `before_specify` hook is configured)

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Add optional cover-letter generation to the existing tailoring session and history, alongside tailored CVs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a cover letter with a tailoring session (Priority: P1)

A candidate preparing tailored CVs can opt into cover letters in the same session, choose whether each letter targets one job or all selected jobs, and receive the documents in the session's output language using the selected profile and jobs.

**Why this priority**: Generating accurate, relevant letters alongside CVs is the primary user value of this feature.

**Independent Test**: Select a profile and multiple normalized jobs, enable letters, choose a letter mode independently of the CV mode, and verify the resulting document count, target jobs, language, and profile association.

**Acceptance Scenarios**:

1. **Given** a candidate has selected jobs, a profile, and an output language, **When** they enable cover letters and start tailoring, **Then** the same session produces both the selected CV outputs and the requested letter outputs.
2. **Given** CV mode is `general` and letter mode is `per_job`, **When** tailoring finishes for *n* selected jobs, **Then** the session contains one CV for all jobs and *n* letters, each associated with its own job.
3. **Given** CV mode is `per_job` and letter mode is `general`, **When** tailoring finishes for *n* selected jobs, **Then** the session contains *n* CVs and one letter associated with all selected jobs.
4. **Given** a candidate disables letters or does not provide a letter option, **When** they start tailoring, **Then** the session behaves as it does today and produces no letters.

---

### User Story 2 - Review and retrieve session outputs (Priority: P2)

A candidate can distinguish the progress and outcome of each CV and letter in the existing request view, then preview and download completed letters from that request and its existing history entry.

**Why this priority**: Generated letters are useful only if candidates can identify the outcome and retrieve them in the same place as their CVs.

**Independent Test**: Complete a session with both output types, open the request from history, and verify that each completed letter shows its target jobs and can be previewed and downloaded.

**Acceptance Scenarios**:

1. **Given** a request contains completed CVs and letters, **When** the candidate opens the request or history, **Then** letters appear beside the CV outputs with their filename, target jobs, status, preview, and download actions.
2. **Given** a request is still processing, **When** the candidate views the existing request status, **Then** they can see that letter outputs are still processing without entering a separate letter lifecycle.
3. **Given** an existing history action supports deleting a request or document, **When** the candidate uses that action, **Then** the associated letter is handled with the same scope and behavior as the CV; no separate letter history or action is introduced.

---

### User Story 3 - Preserve independent output outcomes (Priority: P3)

A candidate can keep a successful CV when a letter fails, or keep a successful letter when a CV fails, and can use existing retry behavior only where it is supported without creating accidental duplicate outputs.

**Why this priority**: Independent outcomes prevent a single generation failure from discarding useful work or misleading the candidate about successful documents.

**Independent Test**: Simulate a failure for one output type while the other succeeds, and verify the successful document remains available and each outcome is shown accurately.

**Acceptance Scenarios**:

1. **Given** letter generation fails but one or more CVs succeed, **When** the request completes, **Then** the CVs remain available and the letter failure is shown without presenting the CV outputs as failed.
2. **Given** CV generation fails but a letter succeeds, **When** the request completes, **Then** the letter remains available and the CV failure is shown without presenting the letter as failed.
3. **Given** a submission is pending or its acceptance is uncertain, **When** the candidate attempts to start the same session again, **Then** the application prevents a duplicate request and directs them to the existing request or history.

### Edge Cases

- One selected job in `general` mode still produces exactly one document for that output type.
- A selected mode other than `per_job` or `general` is rejected before generation; CV and letter modes are validated independently.
- A letter-generation or document-storage failure must not remove already completed CVs, and a CV failure must not remove completed letters.
- A completed request may contain a mix of successful and failed documents; the request and each document must show their actual outcomes.
- If an output is unavailable or still processing, preview and download are not offered as if the document were complete.
- If a session is retried, already successful outputs must not be silently duplicated; retry controls and eligibility follow the existing supported behavior.
- If the selected profile, jobs, or language are unavailable, letter generation must not silently substitute different candidate or job context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The existing tailoring setup MUST offer an opt-in cover-letter choice and a separate `per_job` / `general` letter mode selector alongside the CV mode selector.
- **FR-002**: The candidate MUST be able to choose CV and letter modes independently. Each mode MUST accept only `per_job` or `general`; any other value MUST be rejected.
- **FR-003**: When letters are enabled, the existing tailoring session MUST generate CVs and letters in the same run using the selected jobs, profile, and output language. The letter MUST use normalized job information.
- **FR-004**: For each output type, `per_job` MUST produce one document per selected job and `general` MUST produce exactly one document associated with all selected jobs.
- **FR-005**: When letters are disabled or omitted, the session MUST produce no letters and MUST preserve the existing CV-only behavior and results.
- **FR-006**: Each letter MUST be written in the selected output language and MUST make no unsupported claims about the candidate's experience, achievements, skills, credentials, or qualifications. Job requirements MUST NOT be presented as candidate qualifications unless supported by the selected profile.
- **FR-007**: A letter for a job that also has a tailored CV MUST be consistent with that CV and MUST NOT change the CV or its results. Generating a general letter MUST not change any CV output.
- **FR-008**: The existing request status view MUST show the CV and letter outcomes, including processing, success, and error states for each output. A failure in one output MUST NOT invalidate successful outputs of the other type.
- **FR-009**: The application MUST prevent duplicate submissions while the same session is submitting, pending, or uncertain, and MUST direct the candidate to the existing request or history to check its outcome.
- **FR-010**: Completed letters MUST be available for preview and download from the existing request and history views, with the selected profile and associated job or jobs visible. Existing supported request or document actions MUST apply without creating a separate letter history.
- **FR-011**: Retry behavior MUST follow the existing supported workflow. Any retry offered for a session with letters MUST preserve the selected letter setting and mode and MUST NOT silently duplicate already successful outputs. The application MUST NOT offer per-output retry unless the service supports it.
- **FR-012**: The feature MUST remain within the existing tailoring session, request status, results, and history. It MUST NOT add a standalone letter route, page, navigation entry, job-detail entry point, profile mutation, or automatic job application.

### Key Entities *(include if data involved)*

- **Tailoring session**: The candidate's existing selected job set, profile, output language, and independent CV and optional letter modes.
- **Tailoring request**: The existing record that associates the candidate, selected profile, jobs, language, configuration, and overall processing outcome.
- **Generated document**: A CV or cover letter with a scope, associated job or jobs, processing outcome, errors or warnings, and preview/download availability.
- **Candidate profile version**: The selected source of candidate facts and the profile association retained with the request.
- **Normalized job**: The selected job posting whose normalized information provides target-role context for a job-specific or general output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all four combinations of CV and letter modes, the generated document counts match the selected modes: *n* for `per_job` and exactly one for `general`, where *n* is the number of selected jobs.
- **SC-002**: In 100% of sessions with letters disabled or omitted, no letter is generated and the existing CV outputs remain unchanged.
- **SC-003**: In validation of generated letters, 100% of factual candidate claims are supported by the selected profile or job context, and every letter uses the selected output language.
- **SC-004**: In mixed-success tests, every successful document remains previewable and downloadable while each failed document displays its own failure state.
- **SC-005**: At least 90% of usability-test participants can enable letters, choose a mode, start a session, and find a completed letter in the existing request or history without assistance.
- **SC-006**: Repeated attempts to start a pending or uncertain session create zero additional requests or duplicate documents.

## Assumptions

- `per_job` is the initial letter mode when letters are enabled, matching the existing CV mode default; candidates may select `general`.
- The existing request continues to pin the selected profile, job set, and final output language for every generated document. Profile contents are not submitted as a separate letter-specific selection and are not modified.
- **Verified service contract**: The existing service accepts an optional cover-letter setting that defaults to disabled, requires a valid letter mode when enabled, and accepts `per_job` and `general` independently of the CV mode. It plans one or *n* outputs per type according to the selected mode. Request details include letter documents with job associations and per-document status/error; request status can represent partial success. Existing request history and document retrieval/deletion cover these records.
- **Verified generation behavior**: The existing letter generator uses the selected profile and normalized job data, receives the output language, and validates generated factual claims against supplied profile and job context.
- **Known integration gap**: The current client always submits letters disabled, displays only CV documents, and its whole-request retry also disables letters. The client does not currently provide per-output retry; the service has no separate per-output retry operation. The existing whole-request retry remains the only retry: it must preserve the letter setting and mode, and partial requests do not receive per-output retry unless the service adds support.
- The current client history exposes opening, preview, and download for CV documents but no delete control. If a request or document delete action is exposed by the existing history when this feature is implemented, letters follow that same action; this feature does not introduce a new delete action.
