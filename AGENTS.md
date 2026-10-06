# Architecture Rules

- Preserve legacy CRM update dates in `crm_quotes.source_updated_date`; imported business dates must not be inferred from database write timestamps.
- Use the shared reference-list, list-heading and list-record styles for list-based workspaces so column headers and flat expandable rows remain consistent across modules.
- Load heading fonts from bundled font packages at the application entry point to avoid remote font requests and ensure consistent rendering.
- Scope shared project-resource and documentation access to authenticated users with a workspace profile; collaboration remains shared rather than owner-only.
