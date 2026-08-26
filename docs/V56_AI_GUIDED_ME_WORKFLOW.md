# Dalili v56 — AI-Guided M&E Workflow and Track Results

This update makes Dalili clearer for organisations that do not have dedicated M&E staff.

## Product direction
Dalili should guide a user from project implementation to a report-ready evidence output:

1. Tell Dalili what project is being implemented
2. Set up a simple M&E plan
3. Upload programme evidence
4. Check whether the data is usable
5. Track results from plain questions
6. Review findings
7. Create a report, brief or presentation
8. Export/share the final output

## Key changes

- Sidebar label changed from **Indicators** to **Track Results**.
- Track Results page now starts with plain project questions, not technical M&E language.
- Simple mode and advanced mode are both available.
- Dalili suggests sector-relevant measures such as reach, completion, target achievement, satisfaction and equity.
- The page now includes a Dalili AI interpretation card explaining the calculation in plain language.
- Project Guide now includes an AI draft M&E plan based on project sector.
- Workflow nudges now include AI next-action guidance.
- AI Assistant language now focuses on helping users set up and run the M&E process, not just chat with backend records.

## Design rule
Python calculates. Dalili explains. The AI guide should not invent numbers or findings; it should explain saved project evidence, data quality, tracked results and reports.

## Testing checklist

- Create a project and confirm `/workspace` opens.
- Confirm sidebar says **Track Results**.
- Upload a dataset.
- Open Track Results.
- Use a suggested plain question.
- Confirm Dalili produces a result and explanation.
- Save/export the result.
- Ask the AI Assistant: “What should this project track?”
- Confirm the answer is framed as practical M&E guidance.
