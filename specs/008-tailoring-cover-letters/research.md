# Research: Optional Cover Letters in Tailoring Sessions

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-11-01

## Decisions

### 1. Extend the existing tailoring request

**Decision**: Send the optional letter setting in the existing tailoring request. Keep job IDs, profile ID, and output language shared with the CV; do not create a second request or letter-specific selection flow.

**Rationale**: The current setup and API already send the shared session context. The backend request accepts optional letter configuration and stores it with the existing request.

**Alternatives considered**:

- Add a separate cover-letter request or page: rejected because the feature belongs to the existing session and history.
- Duplicate profile, job, or language selection for letters: rejected because it can create mismatched outputs and is not part of the verified request contract.

### 2. Treat CV and letter mode as independent values

**Decision**: Use the existing `TailoringMode` values (`per_job` and `general`) for each output type independently. Default letters to disabled and the letter mode to `per_job` when enabled. Omit the mode while disabled, preserving the existing `{ enabled: false }` payload.

**Rationale**: The backend request schema uses the same restricted mode set for both settings, defaults the letter option to disabled, and requires a letter mode only when enabled. The generation planner expands each output type according to its own mode.

**Alternatives considered**:

- Couple letter mode to CV mode: rejected because each combination is supported by the backend and required by the feature.
- Omit the disabled letter option: rejected for the current client because it explicitly sends `enabled: false`; preserving that request maintains current behavior.

### 3. Use the existing generation and document records

**Decision**: Treat a letter as another document in the tailoring request, identified by its document kind and existing scope, job association, status, error, warning, filename, and download data. Reuse the same authenticated document retrieval path and preview route.

**Rationale**: Backend request details already return generated documents, including letters; documents carry per-output outcomes and job associations. The current client model is already document-shaped, but its result views filter to CVs.

**Alternatives considered**:

- Add separate letter persistence, history, or download architecture: rejected because existing request/document records already represent letter outputs.
- Add a standalone letter route: rejected because the current preview route can render either document kind.

### 4. Preserve independent success and failure states

**Decision**: Render every returned document's status and error independently of the request-level status. Load terminal failed request details in history as well as completed and partial requests so failed letter outcomes can be inspected.

**Rationale**: The backend records an outcome for each work item and marks a request `partial` when some documents succeed. A request may be `failed` when none succeeds. The existing history loader currently retrieves document detail only for completed and partial requests.

**Alternatives considered**:

- Show only the request status: rejected because it hides which document failed and can imply that a successful CV is unusable.
- Present failed document records as successful outputs: rejected because previews/downloads must remain limited to completed documents.

### 5. Keep retry at the existing whole-request boundary

**Decision**: Preserve the current explicit retry for an entirely failed request, including the original cover-letter enablement and mode. Do not introduce per-output retry for partial requests; no per-output retry operation exists, and the current client only offers retry for request status `failed`.

**Rationale**: The current backend marks a request `failed` only when no document succeeded, and `partial` when any output succeeded. Retrying a failed request therefore does not duplicate successful document outputs. The current client retry body hardcodes letters disabled and must retain the original setting.

**Alternatives considered**:

- Retry successful and failed documents from a partial request: rejected because it could duplicate successful outputs and is not supported by the existing client/service retry contract.
- Add a new per-document retry endpoint: rejected for this feature because it would require a backend contract change and a second retry path.

### 6. Reuse existing UI and state boundaries

**Decision**: Add letter settings to setup and its existing confirmation review; display letters in the request, history, and preview using current styles and controls. Keep the existing process poller, authenticated user scoping, duplicate-submission guards, and local process-ID handling.

**Rationale**: Current setup, request status, history, and preview are already integrated around the `TailoredCvStore` and `TipApi`. Adding a second lifecycle or state store is unnecessary.

**Alternatives considered**:

- Add a parallel letter store or new lifecycle: rejected because it duplicates current request and document state.
- Add a letter launch action on normalized-job details: rejected because the feature is launched only through the existing session setup.

## Verified Contract Evidence

The backend `main` source inspected at commit `2ebc5fa673d9cfcf9dab85c2ff7e713af48464f7` confirms:

- `shared/schemas.py`: `cover_letter.enabled` defaults to false; when enabled, `cover_letter.mode` is required; CV and letter modes use `per_job` or `general`.
- `tailoring/tailoring_service.py`: CV and letter work items are planned separately; general mode receives the merged selected jobs.
- `tailoring/tailoring_router.py`: each item records success/failure, request status reflects completed/partial/failed outcomes, and request detail returns letter document metadata. Existing request and document delete endpoints operate on the shared records.
- `cover_letter/cover_letter_tailoring.py`: generation receives profile, job context, and output language, requests fact-grounded content, and validates generated claims against profile/job context.

Relevant source: [request schemas](https://github.com/saniche/tip-backen-api/blob/2ebc5fa673d9cfcf9dab85c2ff7e713af48464f7/shared/schemas.py), [tailoring router](https://github.com/saniche/tip-backen-api/blob/2ebc5fa673d9cfcf9dab85c2ff7e713af48464f7/tailoring/tailoring_router.py), [generation planner](https://github.com/saniche/tip-backen-api/blob/2ebc5fa673d9cfcf9dab85c2ff7e713af48464f7/tailoring/tailoring_service.py), [cover-letter grounding](https://github.com/saniche/tip-backen-api/blob/2ebc5fa673d9cfcf9dab85c2ff7e713af48464f7/cover_letter/cover_letter_tailoring.py).

## Resolved Constraints

- No unresolved technical clarification remains.
- The client workspace contains no backend source. The implementation changes only the client contract/model and existing user-facing flows; verify the deployed service matches the inspected contract during end-to-end testing.
- The repository constitution is an unfilled template and contributes no project-specific mandates.
