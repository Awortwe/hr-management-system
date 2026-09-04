import { Head } from '@inertiajs/react';

const modules = [
    'Authentication and role-based access',
    'Employee directory and profiles',
    'Departments and positions',
    'Leave balances and approvals',
    'Attendance and timesheets',
    'Monthly payroll and payslips',
    'Dashboards, exports, audit, and settings',
];

const entities = [
    'users',
    'employees',
    'departments',
    'positions',
    'leave_types',
    'leave_balances',
    'leave_requests',
    'attendance_records',
    'payroll_runs',
    'payroll_items',
    'audit_logs',
];

export default function Welcome({ stack }) {
    return (
        <>
            <Head title="Step 1 Foundation" />
            <main className="min-h-screen bg-zinc-50 text-zinc-950">
                <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-8 lg:px-10">
                    <div className="flex flex-1 flex-col justify-center gap-10">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                                PeopleHQ HR Management System
                            </p>
                            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                                Step 1 foundation: stack, SQLite, and the HR database map.
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
                                This project starts as one Laravel application with React screens
                                delivered through Inertia, so authentication, authorization, routing,
                                validation, and business rules stay in one codebase.
                            </p>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                <h2 className="text-base font-semibold">Full Stack</h2>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {stack.map((item) => (
                                        <span
                                            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800"
                                            key={item}
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                <h2 className="text-base font-semibold">Release 1 Modules</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {modules.map((module) => (
                                        <div className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700" key={module}>
                                            {module}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-base font-semibold">Database First Pass</h2>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        The detailed schema plan is captured in docs/database-design.md.
                                    </p>
                                </div>
                                <p className="text-sm font-medium text-emerald-700">SQLite local baseline</p>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {entities.map((entity) => (
                                    <code className="rounded-md bg-zinc-950 px-3 py-2 text-sm text-white" key={entity}>
                                        {entity}
                                    </code>
                                ))}
                            </div>
                        </section>
                    </div>
                </section>
            </main>
        </>
    );
}
