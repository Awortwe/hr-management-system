# PeopleHQ HR Management System

PeopleHQ is a browser-based HR management system built in one Laravel codebase with React screens rendered through Inertia.js. The first release will cover role-based access, employee records, organisation structure, leave, attendance, timesheets, payroll, dashboards, exports, settings, notifications, and audit history.

## Step 1 Status

- Laravel 13 project scaffolded.
- React 19, Inertia.js, Tailwind CSS 4, SQLite, and Pest added as the baseline stack.
- The first Inertia React page replaces the stock Laravel welcome page.
- SQLite is configured in `.env.example`.
- The first-pass HR database design is captured in `docs/database-design.md`.

## Why Inertia

Inertia gives this project one Laravel application, one authentication system, one authorization layer, and normal server-side validation while still letting the interface be written in React. For this release, that means no separate REST API, no duplicated auth rules, and no CORS boundary between backend and frontend.

## Local Runtime

Laravel 13 requires PHP 8.3 or newer. This workspace currently exposes XAMPP PHP 8.2.12 on the command line, so Artisan commands and tests need Herd or another PHP 8.3+ binary selected before they can run locally.

When PHP 8.3+ is active:

```bash
copy .env.example .env
php artisan key:generate
php artisan migrate
npm run dev
php artisan serve
```

## Database Planning

Read `docs/database-design.md` before creating feature migrations. The migration plan is intentionally module-based so each build step can add the tables and tests needed for that slice without getting ahead of the workflow.
