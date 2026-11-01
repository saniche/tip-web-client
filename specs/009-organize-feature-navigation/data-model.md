# Navigation Data Model

This feature introduces no persisted business data, backend changes, or new application state store.

## Business Area

| Field | Meaning and invariant |
|---|---|
| `id` | Stable unique typed identifier for Dashboard, My Profile, Jobs, Job Matching, Applications, Tailoring or Settings. |
| `label`, `icon` | Consistent visible label and decorative local icon; label remains accessible without the icon. |
| `order` | The order specified in [plan.md](./plan.md). |
| `availability` | Navigation configuration reflects existing client destinations, not a transient request, login state or empty data. Settings is hidden; the existing Tailoring session and history destinations are available. |
| `defaultDestination` | Existing destination for an available area; absent for a hidden area. |
| `destinations` | Ordered nonempty collection of existing primary/secondary destinations when available. |

## Route Context

| Field | Meaning and invariant |
|---|---|
| `areaId` | Exactly one owner for each area-owned route, none for auth routes. |
| `pageLabel` and `title` | Human-readable page context and browser title; generic labels are permitted while entity data loads. |
| `parent` | Optional existing parent destination, with required route parameters resolved from the active route; no dead placeholder paths. |
| existing `source` | Preserve `job` or `report` on legacy tailoring launch routes. |

Route context is attached to route definitions. Route parameters and query parameters are inputs to existing pages, not new navigation data. No job, report, application, profile, request or document records are copied into navigation configuration.

## Runtime UI State

- The selected area is derived from the deepest successfully activated route after navigation completes; a rejected navigation does not change it.
- Disclosure/menu state is local and ephemeral. A successful mobile navigation closes the menu; Escape closes the active disclosure or menu and restores focus to its trigger.
- Parent links preserve required identifiers. Existing job/report query parameters and guard return URLs are passed through unchanged.
- Future areas become available only when they have real supported destinations; adding them does not require changing other areas' routes or ownership.
