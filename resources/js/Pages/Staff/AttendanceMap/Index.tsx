import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Head from '../../../Components/PageHead';
import AppLayout from '../../../Layouts/AppLayout';
import type { AttendanceMapMarker, Department, ProjectSite } from '../../../types';

type Props = {
    filters: Record<string, string>;
    departments: Pick<Department, 'id' | 'name'>[];
    projectSites: Pick<ProjectSite, 'id' | 'name' | 'code'>[];
    initialMarkers: AttendanceMapMarker[];
};

type LeafletApi = any;

export default function Index({ filters, departments, projectSites, initialMarkers }: Props) {
    const mapEl = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const [leaflet, setLeaflet] = useState<LeafletApi | null>(null);
    const [markers, setMarkers] = useState(initialMarkers);

    useEffect(() => {
        loadLeaflet().then(setLeaflet);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(async () => {
            const response = await fetch(`/staff/attendance-map/data?${new URLSearchParams(filters).toString()}`);
            const payload = await response.json();
            setMarkers(payload.markers);
        }, 30000);

        return () => window.clearInterval(timer);
    }, [filters]);

    useEffect(() => {
        if (! leaflet || ! mapEl.current || mapRef.current) {
            return;
        }

        mapRef.current = leaflet.map(mapEl.current).setView(defaultCenter(markers), 12);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        layerRef.current = leaflet.layerGroup().addTo(mapRef.current);
    }, [leaflet]);

    useEffect(() => {
        if (! leaflet || ! mapRef.current || ! layerRef.current) {
            return;
        }

        layerRef.current.clearLayers();

        markers.forEach((marker) => {
            const icon = leaflet.divIcon({
                className: '',
                html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;border:3px solid white;background:${marker.zone_status === 'out_of_zone' ? '#dc2626' : '#059669'};box-shadow:0 6px 18px rgba(0,0,0,.25)"></span>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });

            leaflet.marker([marker.latitude, marker.longitude], { icon })
                .bindPopup(`<strong>${escapeHtml(marker.employee_name ?? 'Employee')}</strong><br>${escapeHtml(marker.project_site ?? 'No site')}<br>${formatTime(marker.clock_in_at)} · ${marker.distance_from_site ?? '--'}m`)
                .addTo(layerRef.current);
        });

        if (markers.length > 0) {
            mapRef.current.setView(defaultCenter(markers), 13);
        }
    }, [leaflet, markers]);

    function update(key: string, value: string) {
        router.get('/staff/attendance-map', { ...filters, [key]: value }, { preserveScroll: true, preserveState: true, replace: true });
    }

    return (
        <AppLayout>
            <Head title="Live Attendance Map" />
            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">Live Attendance Map</h1>
                    <p className="mt-1 text-sm text-zinc-600">Today’s field check-ins refresh every 30 seconds.</p>
                </div>

                <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2">
                    <select className="form-input" value={filters.department ?? ''} onChange={(event) => update('department', event.target.value)}>
                        <option value="">All departments</option>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                    <select className="form-input" value={filters.project_site ?? ''} onChange={(event) => update('project_site', event.target.value)}>
                        <option value="">All sites</option>
                        {projectSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </select>
                </section>

                <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <div ref={mapEl} className="min-h-[420px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100" />

                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Live Punches</div>
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-100">
                            {markers.map((marker) => (
                                <div key={marker.id} className="p-4">
                                    <p className="font-semibold">{marker.employee_name}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{marker.department} · {marker.project_site ?? 'No site'}</p>
                                    <p className="mt-2 text-sm">{formatTime(marker.clock_in_at)} · {marker.distance_from_site ?? '--'}m · <span className={marker.zone_status === 'out_of_zone' ? 'text-rose-700' : 'text-emerald-700'}>{marker.zone_status}</span></p>
                                </div>
                            ))}
                            {markers.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No check-ins found for today.</p>}
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

async function loadLeaflet(): Promise<LeafletApi> {
    if (! document.querySelector('link[data-peoplehq-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.peoplehqLeaflet = 'true';
        document.head.appendChild(link);
    }

    const leafletUrl = 'https://esm.sh/leaflet@1.9.4';

    return import(/* @vite-ignore */ leafletUrl);
}

function defaultCenter(markers: AttendanceMapMarker[]): [number, number] {
    if (markers.length === 0) {
        return [5.6037, -0.1870];
    }

    return [markers[0].latitude, markers[0].longitude];
}

function formatTime(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--';
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }[character] ?? character));
}
