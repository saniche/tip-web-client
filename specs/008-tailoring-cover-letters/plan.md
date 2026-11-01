# Implementation Plan: Optional Cover Letters in Tailoring Sessions

**Branch**: `008-tailoring-cover-letters` (Git branch: `main`; no feature branch was created) | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-tailoring-cover-letters/spec.md`

## Summary

Add optional cover-letter configuration to the existing tailoring setup and carry it through the current request, status, results, history, and preview flows. The service contract already supports independent CV/letter modes, grouped letters, per-document outcomes, and persisted letter documents; implementation in this repository is client-only. Preserve CV-only requests when the option is disabled, retain original letter settings on whole-request retry, and do not add per-output retry without service support.

## Technical Context

**Language/Version**: TypeScript 6

**Primary Dependencies**: Angular 22 standalone components, Angular Forms and Signals, RxJS, existing `TipApi` and `TailoredCvStore`

**Storage**: Existing service-owned tailoring requests and documents; no new client or server storage

**Testing**: Vitest through Angular CLI (`npm test -- --watch=false`); production build (`npm run build`)

**Target Platform**: Browser web client

**Project Type**: Angular web application frontend

**Performance Goals**: No new latency target; retain existing asynchronous processing and status polling behavior

**Constraints**: Use the existing tailoring request and document routes; preserve the 1–10 selected-job limit; accepted modes are `per_job` and `general`; no new route, lifecycle, history, or backend architecture

**Scale/Scope**: One existing session and at most ten selected jobs; each output type produces at most ten documents, or one in `general` mode. Update setup/review, request state and retry, request detail/status, history, preview/download, and their colocated tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file contains only unfilled template placeholders; it defines no ratified project principles or mandatory gates.

- **Scope and simplicity**: Pass. Reuse the current session, request, document, and history flows; add no parallel workflow or storage.
- **Compatibility**: Pass. The existing server contract supports the requested configuration; disabled requests remain explicitly disabled as today.
- **Reliability and factual safety**: Pass. Use the existing server-side generation and grounding validation; preserve per-document outcomes.
- **Validation**: Pass. Add focused tests for request payloads, mode independence, retry preservation, status, history, preview, and download; run the client test suite and build.
- **Gate result**: PASS; no constitution-defined violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-tailoring-cover-letters/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tailoring-cover-letter.md
└── tasks.md                 # Created by /speckit-tasks, not by this plan
```

### Source Code (repository root)

```text
src/app/core/
├── api/
│   ├── tip-api.ts
│   └── tailoring-api.spec.ts
├── models/
│   └── tailored-cv.ts
└── state/
    ├── tailored-cv-store.ts
    └── tailored-cv-store.spec.ts

src/app/pages/tailored-cvs/
├── tailored-cv-setup/
│   ├── tailored-cv-setup.ts
│   ├── tailored-cv-setup.html
│   └── tailored-cv-session.spec.ts
├── tailored-cv-confirmation/
│   ├── tailored-cv-confirmation.ts
│   ├── tailored-cv-confirmation.html
│   └── tailoring-confirmation.spec.ts
├── tailored-cv-status/
├── tailored-cv-request-detail/
├── tailored-cv-history/
└── tailored-cv-preview/
```

**Structure Decision**: Keep implementation in the existing Angular tailoring model, API service, signal store, setup/review component, and request/history/preview pages. Tests remain colocated. The server repository is external to this workspace and already provides generation and persistence; no server source changes or new frontend routes are planned.

## Post-Design Constitution Check

- **Scope and simplicity**: Pass. Design extends existing state and document presentation; it introduces no parallel lifecycle or storage.
- **Compatibility**: Pass. The request keeps the existing shared job/profile/language fields and sends `{ "enabled": false }` when letters are off.
- **Reliability and factual safety**: Pass. The existing service validates letter grounding; the client displays each returned document outcome and does not infer success from request-level status alone.
- **Validation**: Pass. Contracts and quickstart scenarios cover all four mode combinations, disabled behavior, partial outcomes, retries, history, preview, and download.
- **Gate result**: PASS; no constitution-defined violations.

## Complexity Tracking

No constitution violations or additional architectural complexity require justification.
