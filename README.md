# PeopleHQ HR Management System

PeopleHQ is a browser-based HR management system built with Laravel 13, React 19, Inertia.js 3, Tailwind CSS 4, and MySQL. It includes session authentication, four roles, employee records and photos, departments and positions, leave approvals and balances, personal and company attendance, payroll, printable payslips, dashboards, CSV exports, searchable lists, and company settings. Notifications, calendars, and audit history remain future enhancements.

## Completed Workflows

The [Word user guide](docs/PeopleHQ_Application_User_Guide.docx) explains local startup, role permissions, and the application workflows step by step.

- Admin and HR have the company dashboard, directory, organization management, leave approvals, company attendance, and payroll.
- Managers have a personal home, direct-report directory and attendance, and leave decisions restricted to their reports.
- Employees have a personal home, profile and balances, clock-in/out, and their own leave requests.
- Admins can create, edit, and delete login accounts. Employee records can be linked to those accounts through the employee form.
- All HR routes require a session. Sign-in is throttled; logout invalidates the session. Navigation works on mobile and desktop.

## Search and Company Settings

Search is available on user accounts, employees, departments, positions, leave types, leave requests/balances, payroll, company/team attendance, and the manager's team directory. Enter a term and press Enter or the search icon; the clear icon restores the list. Employee searches support full names, employee numbers, and work emails. Existing status, department, date, and payroll-period filters remain active. Searches do not expand role permissions, and CSV exports honor the applied employee/payroll search. Employee/account/manager selectors inside forms also have a search field.

Apply the additive migration manually before saving company details (do not use `migrate:fresh` on an existing installation):

```powershell
.\scripts\artisan.ps1 -ArtisanArguments @('migrate')
npm run build
```

Sign in as an admin and open **Company Settings** (`/admin/company`). Update the company name, subtitle, email, phone, website, address, and registration number, then save. Branding updates on subsequent page loads/navigation, including the login page, headers, sidebar, browser titles, CSV filenames, and printable payslips. Contact and registration details appear on payslips; only the public name/subtitle are shared with the login screen. Existing payslips use current company details when reopened; employee salary snapshots are unchanged. Before the migration is applied, existing pages retain default branding and the settings form cannot be saved.

## Verification

```powershell
php artisan test
npx tsc --noEmit
npm run build
npm run test:browser
```

Pest uses an isolated in-memory SQLite database. The browser suite creates and removes a separate temporary SQLite database, starts its own server on a free port, and exercises real login, attendance, leave approval, account changes, CSV downloads, and PDF printing. Neither suite migrates or seeds your configured MySQL database. Browser screenshots and a generated payslip are written under `storage/framework/testing/browser`.

The browser suite uses installed Microsoft Edge on Windows. On other platforms run `npx playwright install chromium` first. `PHP_BINARY` can select a PHP 8.3+ executable; `BROWSER_CHANNEL` can select another supported installed browser.

## Step 1 Status

- Laravel 13 project scaffolded.
- React 19, Inertia.js, Tailwind CSS 4, MySQL, and Pest added as the baseline stack.
- The first Inertia React page replaces the stock Laravel welcome page.
- MySQL is configured in `.env.example`.
- The first-pass HR database design is captured in `docs/database-design.md`.
- Step 2 adds the nine-table HR domain migration and Eloquent models.
- Step 3 adds user roles, role middleware, factories, and a full demo company seeder.
- Step 4 adds the reusable CRUD pattern with complete department and position controllers, typed Inertia pages, role-gated navigation, dialogs, forms, filters, counts, and 403 guard coverage.
- Step 5 adds the employee backend with eager-loaded index/profile endpoints, stacked filters, reusable validation, and safe profile photo create/replace/delete handling.

## Why Inertia

Inertia gives this project one Laravel application, one authentication system, one authorization layer, and normal server-side validation while still letting the interface be written in React. For this release, that means no separate REST API, no duplicated auth rules, and no CORS boundary between backend and frontend.

## Local Runtime

Laravel 13 requires PHP 8.3 or newer. This workspace currently exposes XAMPP PHP 8.2.12 on the command line, so Artisan commands and tests need Herd or another PHP 8.3+ binary selected before they can run locally.

On this Windows workspace, a separate PHP 8.3 runtime is available through the helper below. It does not change XAMPP or your system PATH:

```powershell
.\scripts\artisan.ps1 -ArtisanArguments test
.\scripts\artisan.ps1 -ArtisanArguments @('serve', '--host=127.0.0.1', '--port=8001')
```

On another machine, supply `-Php 'C:\path\to\php.exe'` or select PHP 8.3+ on PATH. Create your MySQL database and run migrations manually before using the application. There are no new migrations for the completion fixes.

When PHP 8.3+ is active:

```bash
copy .env.example .env
php artisan key:generate
mysql -u root -e "create database if not exists peoplehq character set utf8mb4 collate utf8mb4_unicode_ci"
php artisan migrate
php artisan db:seed
npm run dev
php artisan serve
```

For a clean demo database:

```bash
php artisan migrate:fresh --seed
```

The demo admin account is `awortwe.enock@peoplehq.test` and all seeded users use the password `password`.

## Database Planning

Read `docs/database-design.md` before changing feature migrations. Step 2 turns the first HR data model into nine real MySQL-backed domain tables before any controllers are introduced.
