import { Link } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import SearchBar from '../../Components/SearchBar';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../Components/Avatar';
import type { Paginated } from '../../types';
import type { DirectoryMember } from '../SelfService/Profile';

export default function Team({
    members,
    filters,
}: {
    members: Paginated<DirectoryMember> | null;
    filters: { search: string };
}) {
    return (
        <AppLayout>
            <Head title="My Team" />
            <h1 className="text-2xl font-semibold">My Team</h1>
            <SearchBar href="/manager/team" filters={filters} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {members?.data.map((member) => (
                    <article
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                        key={member.id}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar
                                name={member.full_name}
                                src={member.avatar_url}
                            />
                            <h2 className="min-w-0 break-words font-semibold">
                                {member.full_name}
                            </h2>
                        </div>
                        <p className="mt-4 text-sm">
                            {member.position} / {member.department}
                        </p>
                        <p className="mt-2 break-words text-sm text-zinc-600">
                            {member.work_email}
                        </p>
                        <p className="mt-2 text-xs uppercase">
                            {member.status}
                        </p>
                    </article>
                ))}
            </div>
            {!members?.data.length && (
                <p className="mt-6 text-zinc-500">
                    {filters.search ? 'No team members match your search.' : 'No direct reports assigned yet.'}
                </p>
            )}
            <nav className="mt-6 flex justify-between">
                {members?.prev_page_url ? (
                    <Link href={members.prev_page_url}>Previous</Link>
                ) : (
                    <span />
                )}
                {members?.next_page_url && (
                    <Link href={members.next_page_url}>Next</Link>
                )}
            </nav>
        </AppLayout>
    );
}
