# Dalili v57 — Compact UI and Explain-on-Demand Design

Purpose: make Dalili easier for project teams without M&E staff by reducing visible process text while keeping the evidence trail available.

## Design rule

Compact by default. Explain on demand.

Default view should answer:

1. Where am I?
2. What should I do next?
3. What output am I working toward?
4. Can I trust this enough to use in a report?

Technical details should be available through:

- Show details
- Why this matters
- Show evidence note
- Show calculation
- Advanced mode

## What changed

- Sidebar spacing reduced.
- Main page padding reduced.
- Project Guide / workspace made more compact.
- Workflow nudge made shorter and less process-heavy.
- Beginner guidance moved into collapsible detail panels.
- Track Results card spacing reduced.
- Suggested indicator rules moved behind “Show suggested rule”.
- AI process explanation moved behind “Show evidence note”.

## What must remain visible

Dalili should still expose enough evidence for trust:

- Dataset used
- Numerator and denominator
- Missingness/data quality cautions
- Source calculation
- Review status
- Export/report readiness

## What should stay hidden by default

- Long process explanations
- Backend/internal processing details
- Full calculation logic unless requested
- M&E jargon explanations unless requested
- AI workflow language unless requested

## QA checklist

Open these pages and confirm they are not overly long or text-heavy:

- /dashboard
- /workspace
- /data-room
- /quality-check
- /indicators
- /reports
- /settings
- /ai-assistant

Confirm the user can still find details through collapsible panels.
