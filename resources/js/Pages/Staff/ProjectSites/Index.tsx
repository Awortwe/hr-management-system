import { Link, router, useForm } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import SearchBar from '../../../Components/SearchBar';
import AppLayout from '../../../Layouts/AppLayout';
import type { Paginated, ProjectSite } from '../../../types';

type EmployeeOption = {
    id: number;
    employee_number: string;
    full_name: string;
    department?: string | null;
};

type Props = {
    filters: { search: string };
    sites: Paginated<ProjectSite>;
    employees: EmployeeOption[];
};

export default function Index({ filters, sites, employees }: Props) {
    const form = useForm({
        name: '',
        code: '',
        address: '',
        latitude: '',
        longitude: '',
        geofence_radius_meters: 150,
        status: 'active',
        employee_ids: [] as number[],
    });

    function submit() {
        form.post('/staff/project-sites', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    function toggleEmployee(id: number) {
        form.setData('employee_ids', form.data.employee_ids.includes(id)
            ? form.data.employee_ids.filter((employeeId) => employeeId !== id)
            : [...form.data.employee_ids, id]);
    }

    return (
        <AppLayout>
            <Head title="Project Sites" />
            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">Project Sites</h1>
                    <p className="mt-1 text-sm text-zinc-600">Manage geofenced work locations and employee assignments.</p>
                </div>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">New Site</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <input className="form-input" placeholder="Site name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        <input className="form-input" placeholder="Site code" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} />
                        <input className="form-input" placeholder="Latitude" value={form.data.latitude} onChange={(event) => form.setData('latitude', event.target.value)} />
                        <input className="form-input" placeholder="Longitude" value={form.data.longitude} onChange={(event) => form.setData('longitude', event.target.value)} />
                        <input className="form-input" placeholder="Radius meters" type="number" value={form.data.geofence_radius_meters} onChange={(event) => form.setData('geofence_radius_meters', Number(event.target.value))} />
                        <select className="form-input" value={form.data.status} onChange={(event) => form.setData('status', event.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <input className="form-input md:col-span-2" placeholder="Address" value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />
                    </div>
                    <div className="mt-4 max-h-44 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Assign Employees</p>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {employees.map((employee) => (
                                <label key={employee.id} className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm">
                                    <input type="checkbox" checked={form.data.employee_ids.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
                                    <span>
                                        <span className="font-medium">{employee.full_name}</span>
                                        <span className="block text-xs text-zinc-500">{employee.employee_number} · {employee.department ?? 'No department'}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={submit} disabled={form.processing}>
                        Save Site
                    </button>
                </section>

                <SearchBar href="/staff/project-sites" filters={filters} />
                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Site</th>
                                    <th className="px-4 py-3">Coordinates</th>
                                    <th className="px-4 py-3">Radius</th>
                                    <th className="px-4 py-3">Employees</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {sites.data.map((site) => (
                                    <tr key={site.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{site.name}</p>
                                            <p className="text-xs text-zinc-500">{site.code}</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{site.latitude}, {site.longitude}</td>
                                        <td className="px-4 py-3 text-zinc-700">{site.geofence_radius_meters}m</td>
                                        <td className="px-4 py-3 text-zinc-700">{site.employees_count ?? 0}</td>
                                        <td className="px-4 py-3"><Badge value={site.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Link className="text-sm font-semibold text-blue-700" href={`/staff/project-sites/${site.id}`}>View</Link>
                                                <button className="text-sm font-semibold text-rose-700" type="button" onClick={() => router.delete(`/staff/project-sites/${site.id}`, { preserveScroll: true })}>Deactivate</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function Badge({ value }: { value: string }) {
    const classes = value === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600';
    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{value}</span>;
}
