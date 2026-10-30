# Talent Intelligence Platform — Web Client

Angular web application for managing candidate profiles, normalizing job postings, evaluating job/profile fit, and tracking job-search activity.

The client integrates with the Talent Intelligence Platform API and provides the main user workflows from profile preparation through job matching and application tracking.

## Features

### Authentication

- Account registration with display name, email, password, and password confirmation.
- Login using the backend authentication endpoint.
- Authenticated session state and logout.
- HTTP authentication interceptor for API requests.
- Route guards on protected workflows.

### Candidate profile

- Load and update the candidate's unified profile.
- Upload multiple source documents in Markdown (`.md`), DOCX (`.docx`), and PDF (`.pdf`) formats.
- Optionally merge selected files in the browser into one document before upload.
- Track profile-session and individual file-processing statuses.
- Display upload and processing errors.
- Edit contact information, professional summary, output language, and total years of experience.
- Edit structured profile sections, including:
  - Core competencies
  - Soft skills and technical skills
  - Work experience
  - Education
  - Certifications
  - Languages
  - Preferred job titles and locations
  - Additional information
- Save profile changes to the API.

### Job normalization and normalized jobs

- Submit a job posting URL and its source content for normalization.
- Track asynchronous normalization submissions and processing status.
- View the resulting normalized job.
- Browse normalized jobs with title, company, location, and source filters.
- Paginate and change page size.
- View normalized job details, including responsibilities, requirements, desirables, technical stack, and additional information.
- Edit supported job header fields when the current user has write access.
- Delete a normalized job when the current user has write access.
- Add or remove a job from personal interests.

### Job interests

- Browse the user's interested jobs.
- Filter by job title, company, and location.
- Paginate results.
- Open the associated normalized job.
- Remove a job from interests.
- Add jobs to a matching session.

### Job matching

- Build a matching session from jobs selected in Normalized Jobs or My Interests.
- Review and remove selected jobs before submission.
- Check that a candidate profile is available before matching.
- Check and synchronize interest membership for selected jobs.
- Submit the selected job IDs to the matching API.
- Track asynchronous matching processing, including pending/running/completed/failed outcomes.
- Review submission outcomes and retry eligible jobs after a failed or partial submission.
- Resume tracking of an active matching session.

### Matching reports

- Browse previously generated matching reports.
- Open a report and review its job-level results.
- Review matching outcomes, eligibility, score/rank information when supplied, and scoring status.
- Inspect criterion-level evaluations for requirements and desirables, including evidence.
- Read eligibility, matching, and chance-of-success analysis.
- View related normalized job details and compare the report's profile version with the current profile where available.
- Delete a matching report through the API.

### Application journal

- Create an application from a normalized job.
- Browse and filter application entries by job title, company, and location.
- Paginate results and choose the page size.
- View and edit application details.
- Track recruiter name, email, and phone.
- Record contact and follow-up dates.
- Record whether work authorization was discussed.
- Add notes.
- Change application status and add a status-history note.
- Review application status history.
- Delete an application entry.

### Dashboard and workflow views

- Dashboard overview of authentication state, normalization activity, and the current job workflow view.
- Normalization submission status and links to completed normalized jobs.
- A separate Jobs pipeline view for moving workflow items through its displayed stages.

> The Jobs pipeline view and dashboard stage metrics are a lightweight workflow view. They should not be confused with the API-backed Application Journal, which is the source for tracked applications.

## Current client scope and known gaps

The following capabilities are **not currently exposed as complete client workflows** in this repository:

- **Tailored CV generation:** no dedicated client page or end-to-end CV-tailoring workflow is currently present.
- **Cover letter generation:** no dedicated client page or end-to-end cover-letter workflow is currently present.
- **Direct job application submission:** the normalized job detail view currently shows this action as unavailable. Applications are recorded and managed through the Application Journal; the client does not automatically submit applications to employers.
- **Dashboard analytics:** the dashboard is an operational overview, not yet a comprehensive analytics dashboard with aggregated counts and charts across all platform modules.

These items are client-side scope observations, not statements that the corresponding backend capabilities are unavailable.

## Application routes

| Route                   | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `/dashboard`            | Dashboard and workflow overview              |
| `/auth`                 | Login                                        |
| `/auth/register`        | Account registration                         |
| `/profile`              | Candidate profile builder and editor         |
| `/jobs`                 | Workflow pipeline view                       |
| `/normalize-job`        | Submit a job for normalization               |
| `/normalized-jobs`      | Browse normalized jobs                       |
| `/normalized-jobs/:id`  | Normalized job details and available actions |
| `/jobs/interests`       | Manage interested jobs                       |
| `/matching-session`     | Review and submit a matching session         |
| `/matching-reports`     | Matching report history                      |
| `/matching-reports/:id` | Matching report details                      |
| `/applications`         | Application journal                          |
| `/applications/new`     | Create an application entry                  |
| `/applications/:id`     | View and edit an application entry           |

Some routes are protected by the client authentication guard. The profile page also checks authentication before displaying profile data.

## Technology stack

- **Angular 22** — standalone components and Angular Router
- **TypeScript 6**
- **Angular Signals** and **NgRx Signals** — reactive view and workflow state
- **RxJS** — asynchronous API workflows and request orchestration
- **Reactive Forms** — data entry and validation
- **Bootstrap 5** — responsive layout and utility styling
- **PDF.js** — PDF document processing in the browser
- **fflate** — browser-side document/archive utilities
- **Vitest** and **jsdom** — unit testing
- **Prettier** — code formatting

## Architecture

The source is organized around a small set of application layers:

```text
src/
├── app/
│   ├── core/
│   │   ├── api/          # HTTP API service and authentication interceptor
│   │   ├── guards/       # Route guards
│   │   ├── models/       # API and feature models
│   │   ├── state/        # Signal-based application and workflow stores
│   │   └── utils/        # Shared client-side utilities
│   ├── pages/            # Routed feature pages and their components
│   ├── app.config.ts     # Application providers
│   └── app.routes.ts     # Route definitions
├── environments/         # Local, staging, and production API configuration
├── styles.scss           # Global styles
└── main.ts               # Application entry point
```

`TipApi` centralizes HTTP communication with the backend. Feature-specific stores and components manage user interactions, loading/error states, and asynchronous processing. The application uses Angular standalone components and lazy-loaded route components for several feature areas.

## Prerequisites

- Node.js compatible with the installed Angular CLI version
- npm (the repository specifies npm `11.19.0`)
- Access to a running Talent Intelligence Platform API

## Getting started

Clone the repository and install dependencies:

```bash
git clone https://github.com/saniche/tip-web-client.git
cd tip-web-client
npm install
```

Start the development server:

```bash
npm start
```

The Angular development server is normally available at `http://localhost:4200/`.

## API configuration

The API base URL is configured through Angular environment files:

| Configuration     | File                                         | Current API base URL                      |
| ----------------- | -------------------------------------------- | ----------------------------------------- |
| Local development | `src/environments/environment.ts`            | `http://localhost:8000/api/v1`            |
| Staging           | `src/environments/environment.staging.ts`    | `https://staging-api.tip.example.com/api` |
| Production        | `src/environments/environment.production.ts` | `https://api.tip.example.com/api`         |

The staging and production hostnames above are the placeholders currently present in the repository. Replace them with the deployed API URLs before using those environments.

Update the relevant environment file when pointing the client to another API instance. Do not place secrets or private credentials in frontend environment files.

## Development commands

| Command         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm install`   | Install dependencies                                          |
| `npm start`     | Start the Angular development server                          |
| `npm test`      | Run the unit test suite                                       |
| `npm run build` | Build the application                                         |
| `npm run watch` | Rebuild on source changes using the development configuration |

## Testing

Run the unit tests with:

```bash
npm test
```

Run a production build with:

```bash
npm run build
```

Feature pages, stores, models, API behavior, and shared utilities include unit tests. Add or update tests when changing a workflow or its API contract.

## Related repository

- [Talent Intelligence Platform Backend API](https://github.com/saniche/tip-backen-api)
