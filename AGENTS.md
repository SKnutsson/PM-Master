# Architecture Rules

- Preserve legacy CRM update dates in `crm_quotes.source_updated_date`; imported business dates must not be inferred from database write timestamps.