import { router, useForm } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import AppLayout from '../../../Layouts/AppLayout';
import type { AttendanceCorrection, Paginated } from '../../../types';

type Props = {
    corrections: Paginated<AttendanceCorrection>;
};

export default function Index({ corrections }: Props) {
    const reviewForm = useForm({ review_remarks: '' });

    function approve(id: number) {
        reviewForm.patch(`/staff/attendance-corrections/${id}/approve`, { preserveScroll: true });
    }

    function reject(id: number) {
        if (! reviewForm.data.review_remarks.trim()) {
            return;
        }
        reviewForm.patch(`/staff/attendance-corrections/${id}/reject`, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Attendance Corrections" />
            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">Attendance Corrections</h1>
                    <p className="mt-1 text-sm text-zinc-600">Review missed punches, wrong times, and location issues.</p>
                </div>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <label className="block text-sm font-medium text-zinc-700">Review remarks</label>
                    <textarea className="form-input mt-2 min-h-20 w-full" value={reviewForm.data.review_remarks} onChange={(event) => reviewForm.setData('review_remarks', event.target.value)} />
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Request</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {corrections.data.map((correction) => (
                                    <tr key={correction.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{correction.employee?.full_name}</p>
                                            <p className="text-xs text-zinc-500">{correction.employee?.employee_number}</p>
                                        </td>
                                        <td className="px-4 py-3">{formatDate(correction.work_date)}</td>
                                        <td className="px-4 py-3">{titleCase(correction.type)}</td>
                                        <td className="max-w-md px-4 py-3 text-zinc-700">{correction.reason}</td>
                                        <td className="px-4 py-3"><Badge value={correction.status} /></td>
                                        <td className="px-4 py-3">
                                            {correction.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button className="text-sm font-semibold text-emerald-700" type="button" onClick={() => approve(correction.id)}>Approve</button>
                                                    <button className="text-sm font-semibold text-rose-700" type="button" onClick={() => reject(correction.id)}>Reject</button>
                                                </div>
                                            )}
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
    const classes = {
        pending: 'bg-amber-50 text-amber-700',
        approved: 'bg-emerald-50 text-emerald-700',
        rejected: 'bg-rose-50 text-rose-700',
    }[value] ?? 'bg-zinc-100 text-zinc-600';

    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(value)}</span>;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
