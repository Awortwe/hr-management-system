import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type Props = {
    href: string;
    filters: Record<string, string | number>;
    label?: string;
    className?: string;
};

export default function SearchBar({ href, filters, label = 'Search employees', className = 'my-4' }: Props) {
    const [search, setSearch] = useState(String(filters.search ?? ''));
    useEffect(() => setSearch(String(filters.search ?? '')), [filters.search]);

    function visit(value: string) {
        router.get(href, { ...filters, search: value.trim(), page: 1 }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        visit(search);
    }

    return (
        <form role="search" onSubmit={submit} className={`flex w-full max-w-xl items-center gap-2 ${className}`}>
            <input type="search" aria-label={label} placeholder={label} maxLength={150}
                className="form-input min-w-0" value={search} onChange={event => setSearch(event.target.value)} />
            <button type="submit" title="Search" aria-label="Search" className="shrink-0 rounded-md bg-zinc-950 p-2.5 text-white"><Search size={20} /></button>
            {(search || filters.search) && <button type="button" title="Clear search" aria-label="Clear search" className="shrink-0 rounded-md border border-zinc-300 p-2.5" onClick={() => { setSearch(''); visit(''); }}><X size={20} /></button>}
        </form>
    );
}
