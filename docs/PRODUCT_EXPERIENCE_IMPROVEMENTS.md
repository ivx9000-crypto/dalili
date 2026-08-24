# Dalili v47 — Product Experience Improvements

This release removes remaining demo-persona language and improves product-facing functionality.

## Included improvements

- Dashboard greeting now uses the logged-in user’s first name and changes by time of day.
- Removed remaining hard-coded references to demo users such as Aisha.
- Reports now include report status controls: draft, review, approved, and final.
- Reports now include internal share actions: send for review, copy summary, and copy internal link after backend save.
- Maps now include a stronger location table export and an indicator-by-location view when the indicator is disaggregated by the selected geography field.
- Dashboard now includes an evidence workflow timeline showing what has been completed for the active project.
- Team defaults no longer preload fake demo members.

## Notes

The share link is still an internal development link. Production sharing should use authenticated, permission-controlled report links.
