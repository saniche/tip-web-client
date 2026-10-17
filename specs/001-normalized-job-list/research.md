# Research: Normalized Job Listing

## Decision: Use a standalone routed page within the existing Angular application

**Rationale**: The application already uses Angular 22 standalone routed page components, and the feature is a single client-side listing. Keeping the new view standalone avoids a new module or project boundary.

**Alternatives considered**: Add an NgModule or a separate application; neither matches the existing project structure or the feature's scope.

**Sources**: [Angular components guide](https://angular.dev/guide/components)

## Decision: Read filter and pagination state from the route query-parameter stream

**Rationale**: The listing needs shareable, refreshable search state. The existing application configures the router without `withComponentInputBinding`; using `ActivatedRoute.queryParamMap` avoids changing global router setup and permits explicit parsing and validation. Update parameters through router navigation while preserving unrelated query parameters.

**Alternatives considered**: `withComponentInputBinding` can bind query parameters directly to component inputs and is documented as a supported approach. It would require changing the application-wide router configuration and still needs explicit normalization for default and invalid values.

**Sources**: [Angular reading route state](https://angular.dev/guide/routing/read-route-state), [Angular common router tasks](https://angular.dev/guide/routing/common-router-tasks)

## Decision: Use `HttpClient` through the existing API service and cancel superseded requests

**Rationale**: The existing `TipApi` methods return `HttpClient` observables, so the listing should extend that boundary and use `switchMap` from query state to the API request. A newer filter or page selection unsubscribes the prior HTTP request, preventing an older response from replacing the current results. Use `takeUntilDestroyed` for component-lifecycle cleanup.

**Alternatives considered**: Angular's `httpResource` provides reactive fetching and automatic cancellation, and is a documented option. Adopting it here would diverge from the API service's observable interface and is not needed for this feature. Manual subscriptions with loading/error flags are also possible but require more lifecycle and race-condition handling.

**Sources**: [Angular making HTTP requests](https://angular.dev/guide/http/making-requests), [Angular `httpResource`](https://angular.dev/guide/http/http-resource), [Angular `takeUntilDestroyed`](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed)

## Decision: Derive distinct loading, error, results, and empty states from the active request

**Rationale**: Users need to distinguish a successful empty result from a failed request and need a retry path. Keep prior-query records from appearing as though they match the active query; show the loading state until the active request resolves.

**Alternatives considered**: Retain old results during refresh; this risks misrepresenting stale records as matching newly selected filters and is not required by the feature.

**Sources**: [Angular `httpResource` status and response states](https://angular.dev/guide/http/http-resource), [Angular resource status](https://angular.dev/guide/signals/resource)

## Decision: Normalize the confirmed wire response at the API boundary

**Rationale**: The user confirmed that the response envelope contains `Items` (`normalizedJob[]`), `limit` (integer), `total` (integer), and `page` (integer). Keep the page independent from wire naming by mapping `Items` to the internal `items` field in `NormalizedJobPage`.

**Alternatives considered**: Use the wire property name `Items` throughout the UI model; normalizing it at the API boundary keeps the internal model consistent with TypeScript naming conventions.

**Sources**: User-confirmed response model and current repository API boundary.
