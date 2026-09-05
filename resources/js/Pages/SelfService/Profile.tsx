import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../Components/Avatar';

export type DirectoryMember = {
    id: number;
    full_name: string;
    avatar_url: string | null;
    employee_number: string;
    work_email: string | null;
    department: string | null;
    position: string | null;
    status: string;
};
type Profile = DirectoryMember & {
    hire_date: string | null;
    employment_type: string;
    manager_name: string | null;
    balances: {
        id: number;
        type: string;
        year: number;
        entitled_days: string;
        used_days: string;
        remaining_days: number;
    }[];
};

export default function Profile({ employee }: { employee: Profile | null }) {
    return (
        <AppLayout>
            <Head title="My Profile" />
            <h1 className="text-2xl font-semibold">My Profile</h1>
            {!employee ? (
                <p className="mt-6 text-zinc-600">
                    No employee profile is linked to your account yet. Please
                    contact HR.
                </p>
            ) : (
                <>
                    <div className="my-6 flex items-center gap-4">
                        <Avatar
                            name={employee.full_name}
                            src={employee.avatar_url}
                            className="h-20 w-20"
                        />
                        <div>
                            <h2 className="text-xl font-semibold">
                                {employee.full_name}
                            </h2>
                            <p className="text-zinc-600">
                                {employee.employee_number}
                            </p>
                        </div>
                    </div>
                    <dl className="grid gap-5 border-y border-zinc-200 py-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries({
                            Department: employee.department,
                            Position: employee.position,
                            Manager: employee.manager_name,
                            Email: employee.work_email,
                            Status: employee.status,
                            'Hire date': employee.hire_date,
                        }).map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-sm text-zinc-500">
                                    {label}
                                </dt>
                                <dd className="mt-1 break-words font-medium">
                                    {value || 'Not set'}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <h2 className="mt-8 text-lg font-semibold">
                        Leave Balances
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr>
                                    {[
                                        'Type',
                                        'Year',
                                        'Entitled',
                                        'Used',
                                        'Remaining',
                                    ].map((label) => (
                                        <th className="p-3" key={label}>
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {employee.balances.map((balance) => (
                                    <tr
                                        className="border-t border-zinc-200"
                                        key={balance.id}
                                    >
                                        <td className="p-3">{balance.type}</td>
                                        <td className="p-3">{balance.year}</td>
                                        <td className="p-3">
                                            {balance.entitled_days}
                                        </td>
                                        <td className="p-3">
                                            {balance.used_days}
                                        </td>
                                        <td className="p-3 font-semibold">
                                            {balance.remaining_days}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {employee.balances.length === 0 && (
                            <p className="py-4 text-zinc-500">
                                No leave balances recorded yet.
                            </p>
                        )}
                    </div>
                </>
            )}
        </AppLayout>
    );
}
