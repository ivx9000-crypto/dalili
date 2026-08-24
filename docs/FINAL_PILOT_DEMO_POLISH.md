# Dalili Final Pilot Demo Polish

This version fixes the TypeScript nullish-coalescing build error in `EngineQuickActions.tsx` and preserves the protected Dalili baseline.

## Protected files preserved

- `src/app/globals.css`
- `postcss.config.mjs`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/AppShell.tsx`
- `backend/app/main.py`

## Recommended pilot demo route

1. Start backend.
2. Start frontend.
3. Sign up or log in.
4. Open `/pilot-demo`.
5. Create/select a project.
6. Load the demo dataset in Data Room.
7. Run backend DQA.
8. Calculate an indicator.
9. Review insights.
10. Generate/export a report.
11. Ask the AI Assistant what to include in the donor report.
12. Capture feedback in `/feedback`.

## Build fix included

The following expression was corrected:

```tsx
disaggregate_by: latestIndicator?.disaggregateBy ?? (geographyColumn || null),
```

JavaScript/TypeScript requires parentheses when mixing `??` with `||`.
