# Quickstart: Optional Cover Letters in Tailoring Sessions

Validate the feature through the existing tailoring session and document history. See [the request and result contract](./contracts/tailoring-cover-letter.md) and [the data model](./data-model.md).

## Prerequisites

- Run commands from the web-client repository root with dependencies installed.
- Configure the client for a backend that supports the verified letter request and document contract.
- Use an authenticated test account with a usable profile and at least two completed normalized jobs.

## Automated validation

```powershell
npm test -- --watch=false
npm run build
```

Focused coverage should include the existing tailoring API, store, setup, confirmation, request detail, history, and preview tests.

## End-to-end scenarios

1. Open the existing tailoring setup with two selected jobs. Verify that letters default to off and the letter mode selector is separate from the CV mode selector.
2. Enable letters and select each of the four CV/letter mode combinations. Verify the number of CVs and letters independently: `per_job` produces two for two selected jobs; `general` produces one for the selected group.
3. Review the session and verify its selected jobs, profile, output language, CV mode, letter enablement, letter mode, and expected document counts before confirming.
4. Inspect the existing request body. Verify shared `job_ids`, `profile_id`, and `output_language`; verify independent mode values. With letters disabled, verify the existing `{ "enabled": false }` behavior.
5. Complete a request and inspect the existing processing/status, history, and request-detail views. Verify that each letter shows its kind, scope, target jobs, status, error/warning, and filename alongside CV outputs.
6. Open each completed letter using the existing document preview route and download it using the existing action. Verify the preview is read-only and the selected profile and target jobs are shown.
7. Test a letter failure with successful CVs, and a CV failure with a successful letter. Verify successful outputs remain available and failed outputs show distinct errors.
8. Retry a request whose overall status is failed. Verify the retry preserves the letter setting and mode. Verify a partial request does not offer a per-output retry.
9. Submit a request with letters disabled or omitted and verify no letter is generated and CV outputs remain unchanged.
10. Attempt repeated submission while the request is pending or uncertain. Verify no duplicate request is created and the existing request/history recovery guidance is shown.

## Expected outcome

Candidates can opt into accurate letters during the existing tailoring run, select their letter mode independently, and inspect/retrieve the resulting documents through existing session and history views. CV-only sessions and unsupported retry behavior remain unchanged.
