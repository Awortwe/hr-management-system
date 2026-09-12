import { Link } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import AppLayout from '../../../Layouts/AppLayout';
import type { ProjectSite } from '../../../types';

type Props = {
    site: ProjectSite;
};

export default function Show({ site }: Props) {
    return (
        <AppLayout>
            <Head title={site.name} />
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{site.name}</h1>
                        <p className="mt-1 text-sm text-zinc-600">{site.code} · {site.address ?? 'No address'}</p>
                    </div>
                    <Link className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold" href="/staff/project-sites">Back</Link>
                </div>

                <section className="grid gap-3 sm:grid-cols-4">
                    <Metric label="Latitude" value={String(site.latitude)} />
                    <Metric label="Longitude" value={String(site.longitude)} />
                    <Metric label="Radius" value={`${site.geofence_radius_meters}m`} />
                    <Metric label="Status" value={site.status} />
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-200 px-4 py-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Assigned Employees</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <tbody className="divide-y divide-zinc-100">
                                {(site.employees ?? []).map((employee) => (
                                    <tr key={employee.id}>
                                        <td className="px-4 py-3 font-medium">{employee.full_name}</td>
                                        <td className="px-4 py-3 text-zinc-600">{employee.employee_number}</td>
                                        <td className="px-4 py-3 text-zinc-600">{employee.department ?? '--'}</td>
                                        <td className="px-4 py-3 text-zinc-600">{employee.position ?? '--'}</td>
                                        <td className="px-4 py-3 text-zinc-600">{employee.status}</td>
                                    </tr>
                                ))}
                                {(site.employees ?? []).length === 0 && (
                                    <tr><td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>No employees assigned yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}
