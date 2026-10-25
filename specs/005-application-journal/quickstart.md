# Quickstart Guide: Application Journal UI

## Prerequisites

1. Configure the client to use a backend that implements the routes in [the application API contract](contracts/application-api.md).
2. Have an authenticated account and at least one normalized job.
3. Install project dependencies if not already installed.

## Run checks

```powershell
npm test -- --watch=false
npm run build
```

## Scenario 1: Browse and filter

1. Authenticate and navigate to `/applications`.
2. Verify the initial request uses page 1 and page size 20.
3. Verify rows show available job title/company/location/posting date/link, current status, and available recruiter/contact/follow-up details.
4. Apply company, title, and location values together; verify they are sent to the listing endpoint and results start on page 1.
5. Type new filter values quickly; verify only the latest response can replace the list.
6. Navigate next/previous and change the page size; verify pagination metadata and backend order are preserved.
7. Verify loading, no-results, request-error, retry, and invalid-page behavior.

## Scenario 2: Create an application

1. Open the new-application flow and search existing normalized jobs.
2. Select a job and fill optional recruiter, contact, follow-up, work-authorization, and notes fields.
3. Submit once and verify the create request contains the selected job ID and editable data but omits a client-supplied status unless explicitly supported.
4. Verify no separate interest-delete request is made.
5. Verify success navigates to the created entry; duplicate and validation failures display actionable messages without clearing input.
6. Submit twice while pending and verify only one request is sent.

## Scenario 3: Edit application fields

1. Open an application detail and edit recruiter information, dates, work-authorization discussion, or notes.
2. Save and verify the PATCH excludes job, status, and history fields.
3. Verify pending submissions are disabled and failures retain entered values.

## Scenario 4: Update status and review history

1. Select each supported status and submit with and without a note.
2. Verify the status operation is sent with the exact backend value.
3. Verify a successful change reloads and displays the backend's current status and chronological history.
4. Verify history shows timestamps and optional notes and exposes no edit/delete controls.
5. Simulate an error and verify the previous status remains displayed with an error message.

## Scenario 5: Delete an application

1. Request deletion and cancel; verify no DELETE request occurs.
2. Confirm deletion and verify only the application entry is deleted.
3. Verify the UI navigates to a valid page and does not issue normalized-job deletion or interest recreation requests.
4. Simulate deletion failure and verify the entry remains with an error message.
