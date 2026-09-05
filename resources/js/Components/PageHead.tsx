import { Head, usePage } from '@inertiajs/react';
import type { PageProps } from '../types';

export default function PageHead({ title }: { title: string }) {
    const { company } = usePage<PageProps>().props;
    return <Head title={`${title} - ${company.name}`} />;
}
