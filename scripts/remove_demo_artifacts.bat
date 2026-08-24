@echo off
cd /d %~dp0\..
if exist public\demo-data rmdir /s /q public\demo-data
if exist src\components\dashboard\DemoWorkflowCard.tsx del /q src\components\dashboard\DemoWorkflowCard.tsx
echo Demo sample data and unused demo workflow component removed.
