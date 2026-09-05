# PeopleHQ HR Management System

PeopleHQ is a browser-based HR management system built in one Laravel codebase with React screens rendered through Inertia.js. The first release will cover role-based access, employee records, organisation structure, leave, attendance, timesheets, payroll, dashboards, exports, settings, notifications, and audit history.

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
