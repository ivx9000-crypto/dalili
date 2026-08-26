# v59 — Flexible Quantitative Indicator Calculator

This update strengthens the Track Results page so Dalili can calculate more than percentage indicators.

## Purpose

Dalili should help teams without M&E staff calculate common quantitative results from uploaded programme data, then explain the result in plain language.

## Added calculation types

- Count
- Percentage
- Average
- Sum / total
- Minimum
- Maximum

## Added breakdown/disaggregation support

Users can break any result down by a selected column, for example:

- average age by district
- people reached by facility
- completion rate by sex
- satisfaction by location
- total attendance by month

## Design rule

Python/browser code calculates the numbers. Dalili explains the meaning.

## Key test

Upload a dataset with an age column and a district/location column. In Track Results, choose:

1. Average age
2. Average by location
3. Count by location
4. A percentage result

Confirm that the result, valid records, excluded records, and breakdown table update correctly.
