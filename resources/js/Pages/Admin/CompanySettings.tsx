import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Head from '../../Components/PageHead';
import type { CompanySettings } from '../../types';

export default function CompanySettingsPage({ settings, ready }: { settings: CompanySettings; ready: boolean }) {
    const form = useForm({
        name: settings.name, tagline: settings.tagline ?? '', email: settings.email ?? '',
        phone: settings.phone ?? '', website: settings.website ?? '', address: settings.address ?? '',
        registration_number: settings.registration_number ?? '',
        allow_offline_punch: settings.allow_offline_punch ?? true,
        require_device_binding: settings.require_device_binding ?? false,
        default_geofence_radius_meters: settings.default_geofence_radius_meters ?? 150,
        late_threshold_minutes: settings.late_threshold_minutes ?? 15,
        weekend_days: settings.weekend_days ?? ['Saturday', 'Sunday'],
        attendance_approval_rule: settings.attendance_approval_rule ?? 'out_of_zone_only',
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.put('/admin/company', { preserveScroll: true });
    }
    const fields = [
        { key: 'name', label: 'Company Name', max: 120, required: true },
        { key: 'tagline', label: 'Subtitle', max: 160 },
        { key: 'email', label: 'Company Email', max: 255, type: 'email' },
        { key: 'phone', label: 'Phone', max: 50, type: 'tel' },
        { key: 'website', label: 'Website', max: 255, type: 'url' },
        { key: 'registration_number', label: 'Registration Number', max: 100 },
    ] as const;

    return <AppLayout>
        <Head title="Company Settings" />
        <h1 className="text-2xl font-semibold">Company Settings</h1>
        {!ready && <p role="alert" className="mt-4 text-sm text-amber-800">The company settings migration must be run before saving.</p>}
        <form onSubmit={submit} className="mt-6 max-w-3xl space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
                {fields.map(field => <div key={field.key}>
                    <label htmlFor={field.key} className="text-sm font-medium">{field.label}</label>
                    <input id={field.key} className="form-input mt-2" maxLength={field.max}
                        required={'required' in field && field.required} type={'type' in field ? field.type : 'text'}
                        value={form.data[field.key]} onChange={event => form.setData(field.key, event.target.value)}
                        aria-invalid={!!form.errors[field.key]} aria-describedby={form.errors[field.key] ? `${field.key}-error` : undefined} />
                    {form.errors[field.key] && <p id={`${field.key}-error`} role="alert" className="mt-1 text-sm text-rose-700">{form.errors[field.key]}</p>}
                </div>)}
            </div>
            <div>
                <label htmlFor="address" className="text-sm font-medium">Company Address</label>
                <textarea id="address" className="form-input mt-2" rows={4} maxLength={1000} value={form.data.address}
                    onChange={event => form.setData('address', event.target.value)} />
                {form.errors.address && <p role="alert" className="mt-1 text-sm text-rose-700">{form.errors.address}</p>}
            </div>
            <section className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Attendance Rules</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium">
                        <input type="checkbox" checked={form.data.allow_offline_punch} onChange={event => form.setData('allow_offline_punch', event.target.checked)} />
                        Allow offline punch queue
                    </label>
                    <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium">
                        <input type="checkbox" checked={form.data.require_device_binding} onChange={event => form.setData('require_device_binding', event.target.checked)} />
                        Require device binding
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Default Geofence Radius</span>
                        <input className="form-input mt-2" type="number" value={form.data.default_geofence_radius_meters} onChange={event => form.setData('default_geofence_radius_meters', Number(event.target.value))} />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Late Threshold Minutes</span>
                        <input className="form-input mt-2" type="number" value={form.data.late_threshold_minutes} onChange={event => form.setData('late_threshold_minutes', Number(event.target.value))} />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Approval Rule</span>
                        <select className="form-input mt-2" value={form.data.attendance_approval_rule} onChange={event => form.setData('attendance_approval_rule', event.target.value)}>
                            <option value="out_of_zone_only">Out-of-zone only</option>
                            <option value="all_field_punches">All field punches</option>
                            <option value="none">No automatic review</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Weekend Days</span>
                        <input className="form-input mt-2" value={form.data.weekend_days.join(', ')} onChange={event => form.setData('weekend_days', event.target.value.split(',').map(day => day.trim()).filter(Boolean))} />
                    </label>
                </div>
            </section>
            <button disabled={!ready || form.processing} className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-white disabled:opacity-50"><Save size={18} />{form.processing ? 'Saving...' : 'Save Changes'}</button>
        </form>
    </AppLayout>;
}
