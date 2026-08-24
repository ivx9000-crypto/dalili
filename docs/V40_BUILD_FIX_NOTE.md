# Dalili v40 Build Fix Note

This package preserves the v39 pilot polish baseline and explicitly patches the TypeScript build issue in `src/components/dashboard/EngineQuickActions.tsx`.

Fixed expression:

```tsx
disaggregate_by: latestIndicator?.disaggregateBy ?? (geographyColumn || null),
```

This avoids mixing the nullish coalescing operator (`??`) with logical OR (`||`) without parentheses.

Protected fixes preserved:

- `src/app/globals.css` Tailwind v4 setup
- `postcss.config.mjs` using `@tailwindcss/postcss`
- `src/components/layout/Sidebar.tsx` solid dark green sidebar `bg-[#073B2A]`
- `src/components/layout/AppShell.tsx` light readable page background
- `backend/app/main.py` database engine/router alias fix
