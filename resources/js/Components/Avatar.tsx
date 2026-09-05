import { useState } from 'react';

export default function Avatar({
    name,
    src,
    className = 'h-12 w-12',
}: {
    name: string;
    src?: string | null;
    className?: string;
}) {
    const [failedSource, setFailedSource] = useState<string | null>(null);
    if (src && failedSource !== src) {
        return (
            <img
                alt={name}
                src={src}
                onError={() => setFailedSource(src)}
                className={`${className} shrink-0 rounded-lg object-cover`}
            />
        );
    }
    return (
        <span
            aria-label={name}
            className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-semibold text-emerald-800`}
        >
            {name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
        </span>
    );
}
