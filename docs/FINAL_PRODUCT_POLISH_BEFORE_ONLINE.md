# Dalili v49 — Final Product Polish Before Online Deployment

This version focuses on trust, usability and professional readiness before PostgreSQL and online deployment.

## Included improvements

1. Stronger removal of demo/sample projects from project dropdowns and project register.
2. Data Room now creates a practical data dictionary from uploaded Excel/CSV/Kobo-export files.
3. Data dictionary includes clean labels, detected type, missingness, sensitivity flags and recommended use.
4. Data Room stores the latest data dictionary in browser storage for other modules to reference.
5. Added Data Dictionary CSV export.
6. Added sensitive-column warnings for names, phones, health/SRH/HIV/protection, precise location and date/age-risk fields.
7. Organisation profile now has more branding fields: website, default currency, default geography and default report footer.
8. AI Assistant copy now clearly states that it only answers from saved Dalili evidence and should not guess beyond available records.
9. Added starter Privacy, Terms and Data Protection pages:
   - /privacy
   - /terms
   - /data-protection
10. Preserved v48 organisation logo, notifications, project cleanup and branded project brief/report export work.

## Still not production deployment

This is still a local product package. Before real external users upload data, move to PostgreSQL, secure file storage, email-based password reset, stronger backend permissions, HTTPS deployment, backups and monitoring.
