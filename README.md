# Dalili starter v59 — Flexible Quantitative Indicator Calculator

This version strengthens the Track Results page so Dalili can compute common quantitative indicators, including averages and disaggregated tables.

## Main changes

- Track Results now supports calculation types: percentage, count, average, sum, minimum and maximum.
- Users can calculate average age from an uploaded dataset.
- Users can break results down by any column, such as district, facility, sex, age group or month.
- Added quick actions for Average age, Average by location and Count by location.
- The result panel now shows valid records, excluded/missing records, calculation text and a simple Dalili explanation.
- Breakdown tables now work for averages, counts, sums, min/max and percentages.
- Export now includes both a text summary and a CSV breakdown table.

## Design principle

Python/browser logic calculates. Dalili explains.

## Install

Copy this package into `D:\Dalili`, replace files, then run:

```powershell
cd D:\Dalili
npm install
npm run build
npm run dev
```

Backend, if testing locally:

```powershell
cd D:\Dalili\backend
D:\Dalili\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Test

```powershell
cd D:\Dalili
.\scripts\v59_flexible_indicator_calculator_checklist.bat
```

Main page to test:

```text
/indicators
```

Upload data, then test:

- average age
- average age by district/location
- count by district/location
- percentage indicators
- export result
- export CSV table
