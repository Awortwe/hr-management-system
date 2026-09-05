# PeopleHQ Capstone Tour

PeopleHQ is now a complete Laravel, Inertia, React, and MySQL HR management platform built in focused steps.

## Built Platform

- Foundation: Laravel, Inertia, React, Tailwind, MySQL-ready configuration, and the HR data model.
- Data model: users, employees, departments, positions, leave types, leave balances, leave requests, attendance records, payrolls, and payroll items.
- Roles: admin, HR, manager, and employee access with readable route middleware.
- Company seeding: departments, positions, employees, managers, leave balances, attendance, and payslips.
- Organization CRUD: departments and positions with counts, unique-edit validation, dialogs, and toasts.
- Employee management: filtering, eager loading, profile pages, file uploads, avatar URLs, and dependent position dropdowns.
- Leave setup: boolean-safe leave types and derived leave balances.
- Leave workflow: pending to approved or rejected, server-counted days, idempotent approval, transactions, and balance deductions.
- Attendance: employee clock-in/out, friendly guards, server-derived present or late status, and manager team overview.
- Payroll: monthly bulk payroll generation, duplicate-safe payslips, browser-printable Blade payslips, and CSV exports.
- Dashboard: KPI cards, aggregate queries, department headcount bars, pending leave, and recent hires.
- Exports: reusable memory-safe CSV streaming with `streamDownload()` and `chunk(200)`.

## Next Growth Paths

- Notifications for leave approvals, payroll completion, and attendance reminders.
- A calendar view for leave, holidays, and attendance patterns.
- Broader tests around edge cases, browser flows, and CSV/report authorization.
- Audit logs for payroll, leave decisions, employee edits, and attendance corrections.
- Employee self-service profile editing and document storage.
