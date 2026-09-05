import { useState } from 'react';

type Option = { value: string; label: string };

export default function SearchableSelect({ label, value, onChange, options, emptyLabel }: {
    label: string; value: string; onChange: (value: string) => void; options: Option[]; emptyLabel: string;
}) {
    const [search, setSearch] = useState('');
    const words = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = options.filter(option => words.every(word => option.label.toLocaleLowerCase().includes(word)));
    const selected = options.find(option => option.value === value);
    const visible = selected && !matches.includes(selected) ? [selected, ...matches] : matches;

    return <div className="space-y-2">
        <input type="search" aria-label={`Search ${label.toLowerCase()} options`} placeholder={`Search ${label.toLowerCase()}`}
            className="form-input" value={search} onChange={event => setSearch(event.target.value)} />
        <select aria-label={label} className="form-input" value={value} onChange={event => onChange(event.target.value)}>
            <option value="">{emptyLabel}</option>
            {visible.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {matches.length === 0 && <p className="text-xs text-zinc-500" role="status">No matching options.</p>}
    </div>;
}
