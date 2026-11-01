# Quickstart: Job-Specific CV Tailoring

This guide validates the client workflow against the existing profile, matching-report, and tailoring APIs described in [contracts/cv-tailoring.md](./contracts/cv-tailoring.md). No backend changes are required.

## Prerequisites

- The client API environment points to a deployment exposing `/api/v1/profiles` and `/api/v1/tailoring`.
- The backend's existing generation provider and Markdown storage are available.
- A test account has multiple profile versions with different output languages and a completed normalized job.
- A completed matching report exists for that account with multiple valid job results.
- Client dependencies are installed.

## Automated client validation

From the client repository root:

```powershell
npm test -- --watch=false
npm run build
```

## End-to-end scenarios

1. Open normalized job details as an authenticated candidate and add jobs to the tailoring session. Confirm distinct jobs accumulate up to ten, choices persist across in-app navigation, and CV history is a separate page.
2. Open a matching report and start tailoring. Confirm setup offers only valid job IDs from that report and allows selecting one to ten.
3. Confirm profile versions load with labels, default state, timestamps, and output-language values. From job-detail setup, change the selected profile. From report setup, verify the report's profile is fixed and cannot be changed; if it is unavailable, confirm submission is blocked instead of using another profile.
4. Verify output language defaults to the selected profile's language. Change it, submit, and confirm the request uses the changed value while the saved profile remains unchanged.
5. Verify `per_job` is the initial mode and selecting it produces one document per selected job. Select `general` and verify one document represents the selected group.
6. Inspect each POST body: exact selected job IDs, selected profile ID, mode, output language, and `cover_letter.enabled: false`.
7. Verify the processing response's `result_id` is treated as a request ID. Poll processing, retrieve request details, and identify all generated CV documents.
8. Preview the authenticated Markdown response as escaped text and download each completed CV.
9. Test no profiles, profile-list error, report with no usable job IDs, profile version unavailable, empty selection, over-limit selection, unknown status, processing failure, and download failure.
10. Activate submit repeatedly while a request is submitting/processing. Confirm only one POST is made and an active request can be recovered from history.
11. Confirm an unauthorized user cannot list another candidate's profiles or access their tailoring request/document.
12. Run existing profile, matching-report, normalized-job detail, matching-session, and application tests to confirm those workflows are unchanged.
13. Choose **Review tailoring** and verify no request is submitted yet. Review profile, mode, language, and jobs; remove a job, then confirm and verify only remaining IDs are submitted. Removing all jobs must disable confirmation, and returning to setup must permit selecting jobs again.
14. For a failed request, choose **Retry generation**, remove a job in the review, and explicitly confirm. Verify the retry submits only the remaining original jobs; cancelling or removing all jobs must not start a retry.
15. With an unfinished job or report session, open an incompatible source. Keep the existing session and verify its jobs and options remain unchanged; then choose replacement and verify the new source is loaded. A report session must never accept jobs outside that report.
16. Simulate an uncertain submission, then check history. Verify another submission remains blocked until the candidate explicitly acknowledges the duplicate risk after history loads successfully.
17. Discard a session from setup or review. Verify the draft clears, returning to the workspace does not restore it, and no tailoring request is sent. A new draft remains local until **Start tailoring** is selected in review.

An unfinished session is kept in memory while navigating within the application; reloading the browser clears it. Accepted requests remain accessible from history.

## Expected outcome

- The candidate can start setup from either a normalized job or matching report.
- The request uses the selected 1–10 jobs, profile version, mode, and language, with cover letters disabled.
- `per_job` and `general` produce the documented document counts.
- The candidate can track requests, inspect associated job/profile metadata, preview, download, and revisit generated CVs.
