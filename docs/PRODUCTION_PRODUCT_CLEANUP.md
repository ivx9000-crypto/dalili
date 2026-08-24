# Dalili Production Product Cleanup

This version removes demo/pilot presentation elements from the user-facing product. The main app navigation is now focused on real product modules: Dashboard, Projects, Data Room, Quality Check, Indicators, Insights, Reports, Documents, Maps, AI Assistant, Team, Account, Admin Users, and Settings.

## Removed from user-facing navigation

- Pilot Demo
- Pilot Feedback
- Pilot Summary
- Demo Reset
- Commercial Readiness
- Go Live
- Pilot Onboarding
- Backend Status
- Backend Engine
- System Check
- Deployment Prep
- Production Readiness

Those routes redirect to Dashboard if opened directly.

## Demo data

The public sample dataset is no longer part of the product interface. If it already exists locally from an earlier version, run:

```cmd
scripts\remove_demo_artifacts.bat
```

or delete:

```text
public\demo-data
```

## Final-product workflow

1. Create/sign in to account.
2. Create or select a project.
3. Upload real Excel, CSV or Kobo export.
4. Run quality checks.
5. Calculate indicators.
6. Validate insights.
7. Generate reports and exports.
8. Use AI Assistant to explain saved project evidence.
