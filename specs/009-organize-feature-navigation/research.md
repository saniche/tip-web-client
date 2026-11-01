# Research: Client Feature Organization and Navigation

## 1. Information architecture and pipeline

- **Decision**: Group the existing `/jobs` view under Jobs as Workflow pipeline; leave the application journal under Applications.
- **Rationale**: The pipeline uses `AppStore`'s in-memory workflow items and stage advancement; the journal is a separate feature. The dashboard already links to the pipeline. Retaining both avoids conflation and eliminates route migration.
- **Alternatives considered**: Move or merge the pipeline into Dashboard (would obscure an existing standalone view and complicate preservation); label it Applications (misrepresents its data).

## 2. Tailoring and Settings availability

- **Decision**: Expose the existing tailoring session and history under Tailoring. Hide Settings because no destination exists. Preserve routes, guards, contextual links, and existing feature code. Service-backed verification remains a release check but does not disable navigation.
- **Rationale**: The existing route table and pages implement session, history, request, CV/cover-letter preview and download UI, contrary to the initial input assumption. Normal data emptiness, authentication, and temporary outages must not change navigation availability.
- **Alternatives considered**: Assume Tailoring does not exist (would hide existing capabilities); manufacture a placeholder (misleading); infer availability from transient request failures (unstable); add an availability service (unnecessary scope).
- **Evidence and limitation**: Source inspection confirms client implementation. `localhost:8000` was unreachable during planning. The targeted tailoring test command could not compile due to existing unrelated fixture errors, so end-to-end availability has not been demonstrated; see [quickstart.md](./quickstart.md).

## 3. Routing and ownership

- **Decision**: Keep flat routes, existing route order, lazy imports, query strings and legacy route data; apply the existing guard to every feature route except Dashboard and the normalized job listing, while keeping sign-in and registration public. Annotate route metadata with owning area, title and parent context. Determine active state from the deepest successfully activated route.
- **Rationale**: Existing areas span unrelated URL prefixes. Metadata avoids ambiguous prefix matches and preserves bookmarks, guarded return URLs, parameterized details and tailoring source context.
- **Alternatives considered**: URL-prefix matching (fails for grouped routes and overlaps); new nested URLs and redirects (unnecessary compatibility risk); moving page folders (no user benefit).

## 4. Shell and responsiveness

- **Decision**: Reuse the root shell, Bootstrap styling, and a single accessible navigation tree with a mobile disclosure; add only a focused standalone presentational component and local decorative icons if needed.
- **Rationale**: The existing root is the shared layout; no navigation/sidebar abstraction or icon package is present. One tree prevents desktop/mobile state and accessibility drift.
- **Alternatives considered**: Duplicate desktop/mobile menus (increases drift); introduce a UI/icon framework (unnecessary dependency); keep the flat wrapping links (does not provide business-area organization).

## 5. Titles and parent context

- **Decision**: Use route title metadata and reuse existing page headings/back links; add breadcrumbs only for missing parent context.
- **Rationale**: Pages already supply their own headings and several detail pages have parent links; a second shell heading would duplicate page titles. Generic route titles avoid requiring new data fetches.
- **Alternatives considered**: Rewrite feature pages to enforce a common heading (outside scope); always add breadcrumbs alongside existing back links (unnecessary duplication).

## 6. Validation approach

- **Decision**: Use the existing Vitest/jsdom and Angular router test infrastructure for component/route behavior, plus manual real-browser responsive and keyboard checks and service-backed tailoring checks.
- **Rationale**: Existing tests use Angular TestBed and `RouterTestingHarness`; no E2E framework is configured. jsdom cannot prove layout or actual browser navigation.
- **Alternatives considered**: Add a new E2E framework solely for this work (unnecessary tooling); treat unit tests or static source inspection as proof of end-to-end availability (insufficient).
