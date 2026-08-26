# Dalili v55 — Guided M&E Setup and Project Workflow

## Purpose

This version reframes Dalili around a clearer product promise:

> Dalili helps organisations without dedicated M&E staff set up simple project monitoring, track progress, understand results, and produce professional reports or briefs.

The app should not assume the user already knows M&E language. It should guide a project person from project creation to final evidence output.

## Main user journey

1. Tell Dalili about the project.
2. Open the Project Guide.
3. Add evidence or data.
4. Check whether the data is safe and usable.
5. Choose what to measure.
6. Review findings.
7. Create a report, brief or presentation.
8. Export or share the final output.

## New/updated user-facing features

### Project Guide

Added a new route:

```text
/workspace
```

This page acts as the project command centre. It shows:

- the active project
- current M&E journey progress
- next recommended action
- beginner-friendly explanations
- a simple sector-based M&E plan
- suggested indicators
- plain-language explanations of Evidence, Quality Check, Indicator, Insight and Output

### Next best action

A new workflow nudge is shown on main analysis pages. It tells the user what to do next based on project state.

### Post-project creation redirect

After creating a project, Dalili opens `/workspace` instead of leaving the user unsure what to do next.

### Beginner-friendly language

Dashboard and workflow language now says things like:

- “Check whether your data is usable”
- “Choose what to measure”
- “Review what Dalili found”
- “Create a report or brief”

This is easier for project teams without formal M&E skills.

## Files changed

```text
src/lib/workflow.ts
src/components/workflow/WorkflowNudge.tsx
src/app/workspace/page.tsx
src/app/workspace/WorkspaceClient.tsx
src/app/dashboard/page.tsx
src/components/dashboard/ProductOnboardingCard.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
src/app/projects/ProjectsClient.tsx
src/app/data-room/page.tsx
src/app/quality-check/page.tsx
src/app/indicators/page.tsx
src/app/insights/page.tsx
src/app/reports/page.tsx
src/app/maps/page.tsx
src/app/ai-assistant/page.tsx
```

## Test checklist

- Create a new account or log in.
- Create a project.
- Confirm Dalili redirects to `/workspace`.
- Confirm the Project Guide explains what to do next.
- Confirm the sidebar shows “Project Guide”.
- Confirm dashboard shows the guided M&E journey.
- Upload evidence/data.
- Confirm the next action changes to quality checking.
- Run quality check.
- Confirm the next action changes to indicator creation.
- Create an indicator.
- Confirm the next action changes toward insights/reports.

## Important

This version preserves the existing production setup:

- Render backend
- Vercel frontend
- PostgreSQL setup
- authentication
- organisation logo
- notifications
- reports/exports
- maps
- AI Assistant
- legal/compliance pages
