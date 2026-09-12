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
            <button disabled={!ready || form.processing} className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-white disabled:opacity-50"><Save size={18} />{form.processing ? 'Saving...' : 'Save Changes'}</button>
        </form>
    </AppLayout>;
}
