# Dalili Pilot Demo Script

Use this script when showing Dalili to a colleague, potential partner, funder, or early user.

## 1. Opening message

Dalili is an M&E and research intelligence platform that helps programme teams move from raw data to quality checks, indicators, reviewed insights, and donor-ready reports.

The demo uses a sample Uganda health dataset so the workflow is predictable.

## 2. Demo path

1. Start at `/pilot-demo` to show the full workflow.
2. Open `/projects` and create or select a project.
3. Open `/data-room` and use **Load sample dataset**.
4. Run backend profile and backend DQA.
5. Open `/quality-check` and show the quality score, missingness, duplicates, and readiness label.
6. Open `/indicators` and calculate an indicator such as `hiv_tested = Yes`.
7. Open `/insights`, review insight cards, and approve or flag them.
8. Open `/reports`, save a report draft, and export DOCX/PPTX/PDF/Excel.
9. Open `/ai-assistant` and ask: `What should I put in the donor report?`
10. Open `/production-readiness` to show what is ready and what still requires production hardening.

## 3. Key points to say

- Dalili does not replace M&E professionals; it supports their analysis and reporting work.
- Every finding should be linked to a calculation, data source, or saved project context.
- Python/backend logic should calculate figures; AI should explain and draft.
- The product is designed around African M&E realities: Kobo/Excel data, donor reporting, messy locations, data quality gaps, and low-bandwidth use.

## 4. Current limitations to disclose

- This is still a local pilot demo, not production deployment.
- The AI assistant is currently rule/context-based, not yet connected to a production LLM.
- Authentication is a local development foundation and still needs production security hardening.
- SQLite is used for local development; PostgreSQL is recommended for production.
- Real production hosting, backup, HTTPS, and email workflows still need to be configured.

## 5. Recommended demo close

The purpose of this pilot is to validate whether Ugandan and East African M&E, research, and programme teams find the workflow useful enough to adopt: project setup, dataset upload, quality review, indicator calculation, insight validation, and report export.
