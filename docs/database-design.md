# PeopleHQ Database Design

Step 1 captures the HR database on paper before feature migrations are written. The first release is a single-organisation system with role-based access, employee records, leave, attendance, timesheets, payroll, dashboards, exports, settings, notifications, and audit history.

## Stack Decision

PeopleHQ uses Laravel 13, React 19, Inertia.js, Tailwind CSS 4, MySQL for development and production data, and Pest for automated tests.

Inertia keeps the project in one Laravel codebase. We get one authentication system, one authorization layer, server-side validation, normal Laravel routes, and React pages without introducing a separate REST API or CORS boundary for Release 1.

## Core Tables

| Table | Purpose | Key relationships |
| --- | --- | --- |
| users | Authentication identity, account status, and role assignment | Optionally linked to one employee |
| employees | Personal, contact, employment, emergency, and payroll master data | Belongs to department, position, manager, and optional user |
| departments | Organisation units | Has employees, positions, and optional manager |
| positions | Job titles | Belongs to optional department and has employees |
| leave_types | Configurable leave categories | Has leave balances and requests |
| leave_balances | Annual entitlement and used days per employee/type/year | Belongs to employee and leave type |
| leave_requests | Leave dates, reason, status, approver, and decision metadata | Belongs to employee, leave type, and approver |
| attendance_records | Daily clock-in/out events, status, and worked minutes | Belongs to employee |
| payrolls | Monthly payroll batch status and totals | Has payroll items |
| payroll_items | Employee payroll snapshots for a run | Belongs to payroll and employee |

## Entity Notes

### users

- Fields: name, email, password, role, status, email_verified_at, remember_token.
- Constraints: unique email.
- Release 1 roles: admin, hr, manager, employee.
- Account status values: active, suspended.

### employees

- Fields: employee_number, names, birth date, gender, profile photo path, work email, personal email, phone, address, department_id, position_id, manager_id, hire_date, employment_type, status, work_location, emergency contact fields, salary fields, bank fields, statutory reference fields, profile_completion, user_id.
- Constraints: unique employee_number, unique nullable user_id.
- Sensitive payroll and bank fields must be excluded from general directory exports.
- Status values: probation, active, suspended, resigned, terminated.

### departments and positions

- Departments can have one active manager.
- Positions can optionally belong to a department.
- Records referenced by active employees should be deactivated or soft-deleted instead of physically removed.

### leave

- leave_types define name, allowance, paid flag, color, and active status.
- leave_balances track entitlement, used days, adjustments, and year.
- leave_requests track start date, end date, requested working days, reason, status, decision comment, decided_by, and decided_at.
- Approval must run in a database transaction that locks the balance, revalidates availability, updates the request, deducts the balance, and writes audit history.
- Active overlapping leave requests for the same employee are blocked.

### attendance and timesheets

- attendance_records track employee_id, work_date, clock_in_at, clock_out_at, status, worked_minutes, correction_reason, corrected_by, corrected_at.
- Unique rule: one attendance record per employee per work day.
- Status values: present, late, absent, on_leave, incomplete.
- Timesheets are derived from attendance first; a separate timesheet table can be added only if later steps require stored monthly snapshots.

### payroll

- payroll_runs track month, year, status, totals, created_by, reviewed_by, finalized_by, and finalized_at.
- Unique rule: one payroll run per month and year unless a future correction process is explicitly added.
- payroll_items snapshot employee identity, department, position, basic salary, gross pay, total deductions, employer contributions, net pay, and rounding details.
- payroll_components store line type, label, amount, and treatment.
- Money uses fixed decimal columns, never floating point.
- Finalised payroll is read-only except through a controlled correction process.

## Integrity Rules

- Use foreign keys for all relationships.
- Index searchable fields, status columns, dates, and foreign keys.
- Use server-side policies for every protected action.
- Use transactions for leave approval, payroll generation, payroll finalisation, balance adjustment, attendance correction, and sensitive employee status changes.
- Store uploaded profile photos as files with generated names, not as database blobs.
- Use MySQL in development and production so foreign key behavior, indexes, and decimal handling match the target database.

## First Migration Order

1. departments
2. positions
3. employees
4. leave_types
5. leave_balances
6. leave_requests
7. attendance_records
8. payrolls
9. payroll_items

This order keeps foreign keys straightforward and gives the first application slice the nine domain tables needed before controllers are introduced.
