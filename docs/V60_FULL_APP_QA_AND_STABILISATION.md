# Dalili v60 — Full App QA and Bug-Fix Stabilisation

This version is a stabilisation release. It does not add a major product feature. It adds a page-by-page review process so broken flows can be found and fixed systematically.

## Purpose

Dalili should guide a non-M&E user from project setup to report-ready evidence. Every visible page should therefore pass five tests:

1. The page opens without crashing.
2. The page explains what it is for in simple language.
3. The main button or form works.
4. Data is saved or synced clearly.
5. The next action is obvious.

## New page

Open:

```text
/qa-review
```

Use the page to check:

- backend health
- operations endpoints
- database connection
- project existence
- dataset upload state
- quality-check state
- Track Results state
- report state
- manual page-by-page actions

## Core journey to test

```text
Signup
→ Onboarding
→ Create project
→ Project Guide
→ Upload data
→ Quality Check
→ Track Results
→ Insights
→ Reports
→ Export
→ Logout and login again
```

## Bug register format

For every issue, record:

```text
Page:
Action:
Expected:
Actual:
Severity:
Screenshot/console error:
Backend log if available:
```

## What should not be changed

Preserve the working product foundations:

- dark green sidebar
- readable light background
- guided M&E workflow
- compact explain-on-demand UI
- Data Room crash fix
- flexible quantitative calculator
- organisation logo
- project dropdown cleanup
- notifications
- PostgreSQL/Render/Vercel setup
- privacy/terms/data-protection pages
