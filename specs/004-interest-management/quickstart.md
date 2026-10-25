# Quickstart Guide: Interest Management UI

## Overview

This guide details validation scenarios for the Interest Management feature, ensuring end-to-end functionality from user interactions through API integration and error handling.

---

## Prerequisites

1. Active development server running:
   ```bash
   npm start
   ```
2. Running tests:
   ```bash
   npm test
   ```
3. Authenticated session in the application (or mocked auth store).

---

## Scenario 1: Browse User Interests

1. Navigate to `http://localhost:4200/jobs/interests` (or click "Interests" in the navigation bar).
2. **Verify**:
   - Page displays a table or list of interests with Job Title, Company, Location, Posting Date, Source link, and Interest Date.
   - Job Title is clickable and links to `/normalized-jobs/:id`.
   - Results are ordered newest first by interest creation date.
   - Pagination reflects page 1 and shows total count.

---

## Scenario 2: Search and Filter Interests

1. On the interests page, type in the "Company" filter: `Acme`.
2. Wait 300 ms (debounce duration).
3. **Verify**:
   - The query automatically executes with `company=Acme&page=1`.
   - Results display only jobs matching "Acme".
4. Add a "Title" filter: `Engineer`.
5. **Verify**:
   - Request fires combining both `company=Acme` and `title=Engineer`.
6. Click "Clear filters".
7. **Verify**:
   - All filter fields are emptied and the complete interest list is restored on page 1.

---

## Scenario 3: Remove an Interest with Confirmation

1. Locate any interest item in the listing.
2. Click the "Remove" action button.
3. **Verify**:
   - An inline or modal confirmation prompt appears.
4. Click "Cancel".
5. **Verify**:
   - The confirmation prompt closes without deleting the item.
6. Click "Remove" again and click "Confirm".
7. **Verify**:
   - In-flight pending state disables the button.
   - Upon completion, the row is removed from view and total count decrements by 1.
   - If the item was the last remaining record on page 2, the listing automatically navigates to page 1.

---

## Scenario 4: Toggle Interest from Normalized Job Details

1. Navigate to `/normalized-jobs/{id}`.
2. Observe the job header action area.
3. Click the interest toggle button.
4. **Verify**:
   - The button enters an in-flight loading/disabled state.
   - Successful `POST /jobs/{id}/interest` updates the button state to indicate the job is saved to interests.
5. Click the toggle button again.
6. **Verify**:
   - Successful `DELETE /jobs/{id}/interest` updates the button state to indicate the job is no longer saved.
