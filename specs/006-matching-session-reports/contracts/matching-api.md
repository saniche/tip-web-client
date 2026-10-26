# Matching API Contract Inventory

**Status**: Provisional frontend contract based on the user-provided feature brief. The user confirmed that no backend OpenAPI/schema is available and asked to proceed with this model.

The workspace contains no backend source. Matching/report methods are implemented in `TipApi` from this provisional inventory, but the routes and shapes are not independently verified against server code. Implement only the fields and behaviors described here; surface invalid or missing data explicitly. The assumptions below are provisional and must not be represented as confirmed backend guarantees.

## Existing Frontend Operations

| Operation                 | Current frontend evidence                                                                                     | Contract notes                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List normalized jobs      | `TipApi.listNormalizedJobs` calls `GET /jobs/normalized`; paginated `items`, `limit`, `total`, `page`.        | Existing API, already modeled.                                                                                                                                               |
| Get normalized job        | `TipApi.getNormalizedJob(jobId)` calls `GET /jobs/{id}`.                                                      | Single-job lookup; no batch method exposed by this client.                                                                                                                   |
| List interests            | `TipApi.listInterests` calls `GET /jobs/interests`; paginated `items`, `limit`, `total`, `page`.              | Existing API, already modeled.                                                                                                                                               |
| Add an interest           | `TipApi.addInterest(jobId)` calls `POST /jobs/{id}/interest` and is typed `Observable<void>`.                 | Backend behavior for duplicate adds and independent failures is not established by the frontend type.                                                                        |
| Read profile              | `TipApi.getProfile()` calls `GET /profile`; `UserProfile` has `id`, `user_id`, `data`, and `output_language`. | No explicit frontend built/readiness field. The client checks availability only; matching readiness remains backend-authoritative.                                           |
| Read processing operation | `TipApi.getProcessingJob(id)` calls `GET /processing-jobs/{id}` and maps through normalization types.         | Current mapper recognizes normalization statuses and converts unknown status values to `pending`; do not use this mapping for matching. Preserve behavior for normalization. |

## Implemented Provisional Matching Operations

### Submit matching

- **Method/path**: `POST /matching/`
- **Request described in brief**: `{ "job_ids": ["string"] }`
- **Response described in brief**: processing `id`, `status`, optional/null `result_id`, optional/null `error`.
- **Known product constraint**: one accepted call creates exactly one report.
- **Known from brief**: one accepted call creates exactly one report; the request contains only `job_ids`; the response describes `id`, `status`, `result_id`, and `error`.
- **Unresolved**: exact nullability and error behavior, terminal initial statuses, server-side interest prerequisite, batch-size limit and exposure, and whether a lost response can leave acceptance ambiguous. Do not split a request; surface rejection for user action.

### Read matching process

- **Method/path**: `GET /processing-jobs/{job_process_id}`
- **Response described in brief**: `id`, `status`, optional/null `result_id`, optional/null `error`.
- **Known statuses in brief**: `pending`, `running`, `done`, `failed`.
- **Known from brief**: the returned process is tracked by its process ID; the described statuses are `pending`, `running`, `done`, and `failed`.
- **Unresolved**: exact nullability and timing of `result_id`, and whether an accepted submission may return terminal status immediately.
- **Client rule**: retain unknown status strings as unknown. Only verified `done` and `failed` are terminal. Network errors preserve the last confirmed status and never trigger a new submission.

### List reports

- **Method/path**: `GET /matching/reports`
- **Fields described in brief**: report `id`, `status`, `created_at`, `profile_id`.
- **Provisional assumption**: treat the response as an array of report summaries because no envelope is supplied. If the runtime response is not an array of records with the described fields, show an explicit load error rather than silently adapting to an invented envelope.
- **Unresolved**: report status values, pagination, ordering/default sort, optional fields, and whether report metadata includes job associations. Do not invent pagination or per-report detail fan-out.
- **Client rule**: do not call a detail endpoint per list item to enrich the history.

### Read a report

- **Method/path**: `GET /matching/reports/{report_id}`
- **Fields shown as an example in brief**: report `id`, `status`, `results`; a result may contain `id`, `job_id`, `score`, `eligible`, `scoring_status`, `breakdown`, `rank`, and `explanation`.
- **Current explanation shape described in brief**: `requirements`, `desirables`, `notes`, and `analysis` with `eligibility`, `matching`, and qualitative `chance_of_success`; each criterion item has `criterion`, exact `Yes`/`No` `judgment`, and `evidence`.
- **Known from brief**: example result fields are `id`, `job_id`, `score`, `eligible`, `scoring_status`, `breakdown`, `rank`, and `explanation`. The described current explanation has requirements, desirables, notes, and analysis sections.
- **Unresolved**: exact schema/version field, result and explanation nullability, `score`/`rank` nullability, `breakdown` shape, legacy formats, scoring-status values and failed/unscored classification, and whether detail metadata includes `profile_id`.
- **Client rule**: show full current-format details only when the supplied structure can be validated; otherwise use the simplified legacy view. Never fabricate fields or recalculate scores/ranks. Preserve unknown scoring statuses and avoid claims that require their interpretation.

### Delete a report

- **Method/path**: `DELETE /matching/reports/{report_id}`
- **Known from brief**: use the existing delete operation; require user confirmation and retain the report on failure.
- **Unresolved**: response semantics, report terminal status values, and behavior for inaccessible reports. Disable deletion for the report tracked by an active non-terminal session. For other records, only enable deletion when the status can be safely identified as terminal; keep deletion unavailable for an unknown status.
- **Current UI behavior**: deletion remains disabled for every report because no report terminal status values are known. Do not infer report terminality from process statuses.

## Provisional Implementation Rules

The user directed implementation to proceed using the provided model despite the absence of backend schemas. Use explicit fields and statuses from the brief and the labeled array assumption above only for report listing. Do not infer report terminal values from process statuses, infer duplicate-interest success from an error, infer profile readiness from data content, or infer a batch limit. Report detail current-format rendering requires full structural validation; all other explanations use a safe legacy display. If runtime behavior disagrees with the provisional contract or requires an unprovided field/value, show a recoverable error and document the limitation; do not add backend changes or success-shaped defaults.
