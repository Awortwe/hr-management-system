import { useForm } from '@inertiajs/react';
import { Camera, LocateFixed, RefreshCcw, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Head from '../../../Components/PageHead';
import AppLayout from '../../../Layouts/AppLayout';
import SafeAvatar from '../../../Components/Avatar';
import type { AttendanceRecord, Department, Employee, Position, ProjectSite, Shift } from '../../../types';

type Props = {
    employee: (Pick<Employee, 'id' | 'employee_number' | 'full_name' | 'avatar_url'> & {
        department?: Pick<Department, 'id' | 'name'> | null;
        position?: Pick<Position, 'id' | 'title'> | null;
        shift?: Shift | null;
        project_sites?: ProjectSite[];
        has_project_site_assignment?: boolean;
    }) | null;
    hasActiveProjectSites: boolean;
    todayRecord: AttendanceRecord | null;
    recentRecords: AttendanceRecord[];
    workDate: string;
    lateAfter: string;
};

type LocationState = {
    latitude: number | null;
    longitude: number | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    message: string;
};

type OfflinePunch = {
    id: string;
    action: 'clock-in' | 'clock-out';
    latitude: number | null;
    longitude: number | null;
    createdAt: string;
};

const offlineKey = 'peoplehq.offlinePunches';

export default function Index({ employee, hasActiveProjectSites, todayRecord, recentRecords, workDate, lateAfter }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const selfieInputRef = useRef<HTMLInputElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraStatus, setCameraStatus] = useState('Camera not started.');
    const [selfie, setSelfie] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [offlinePunches, setOfflinePunches] = useState<OfflinePunch[]>(() => readOfflinePunches());
    const [location, setLocation] = useState<LocationState>({
        latitude: null,
        longitude: null,
        status: 'idle',
        message: 'GPS not captured yet.',
    });

    const punchForm = useForm<{ latitude: number | ''; longitude: number | ''; check_in_selfie?: File | null; check_out_selfie?: File | null }>({
        latitude: '',
        longitude: '',
        check_in_selfie: null,
        check_out_selfie: null,
    });
    const correctionForm = useForm({
        type: 'missed_check_in',
        work_date: workDate,
        requested_clock_in_at: '',
        requested_clock_out_at: '',
        requested_latitude: '',
        requested_longitude: '',
        reason: '',
    });

    const hasClockedIn = Boolean(todayRecord?.clock_in_at);
    const hasClockedOut = Boolean(todayRecord?.clock_out_at);
    const nextAction: 'clock-in' | 'clock-out' = hasClockedIn ? 'clock-out' : 'clock-in';
    const canPunch = Boolean(employee) && Boolean(selfie) && location.status === 'ready' && ! hasClockedOut && ! punchForm.processing;
    const detectedSite = useMemo(() => detectSite(employee?.project_sites ?? [], location.latitude, location.longitude), [employee?.project_sites, location.latitude, location.longitude]);
    const siteMessage = siteStatusMessage(hasActiveProjectSites, employee?.has_project_site_assignment ?? false, detectedSite?.site?.name, todayRecord?.project_site?.name);

    useEffect(() => () => stopCamera(), []);
    useEffect(() => {
        const onOnline = () => setOfflinePunches(readOfflinePunches());
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, []);

    async function startCamera() {
        try {
            if (! navigator.mediaDevices?.getUserMedia) {
                setCameraStatus('This browser cannot open the camera here. Use Upload Photo instead.');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraStatus('Camera ready. Capture a clear selfie before punching.');
        } catch {
            setCameraStatus('Camera permission was denied or no camera was found. Use Upload Photo instead.');
        }
    }

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    function captureSelfie() {
        if (! videoRef.current || ! canvasRef.current || ! streamRef.current) {
            setCameraStatus('Start the camera before capturing a selfie.');
            return;
        }

        const video = videoRef.current;
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            setCameraStatus('The camera is not ready yet. Wait a moment, then capture again.');
            return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (! blob) {
                setCameraStatus('Selfie capture failed. Please try again.');
                return;
            }

            const file = new File([blob], `attendance-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelfie(file);
            setSelfiePreview(URL.createObjectURL(file));
            setCameraStatus('Selfie captured.');
        }, 'image/jpeg', 0.88);
    }

    function selectSelfie(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (! file) {
            return;
        }

        if (! file.type.startsWith('image/')) {
            setCameraStatus('Please choose an image file for the selfie.');
            return;
        }

        setSelfie(file);
        setSelfiePreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return URL.createObjectURL(file);
        });
        setCameraStatus('Selfie selected.');
    }

    function captureGps() {
        if (! navigator.geolocation) {
            setLocation({ latitude: null, longitude: null, status: 'error', message: 'GPS is not available on this browser.' });
            return;
        }

        setLocation((current) => ({ ...current, status: 'loading', message: 'Requesting GPS permission...' }));
        navigator.geolocation.getCurrentPosition(
            (position) => setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                status: 'ready',
                message: `GPS captured with ${Math.round(position.coords.accuracy)}m accuracy.`,
            }),
            () => setLocation({ latitude: null, longitude: null, status: 'error', message: 'GPS permission was denied or the location could not be detected.' }),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
    }

    function submitPunch() {
        if (! selfie || location.latitude === null || location.longitude === null) {
            return;
        }

        const payload = {
            latitude: location.latitude,
            longitude: location.longitude,
            check_in_selfie: nextAction === 'clock-in' ? selfie : null,
            check_out_selfie: nextAction === 'clock-out' ? selfie : null,
        };

        punchForm.transform(() => payload);
        punchForm.post(`/self-service/attendance/${nextAction}`, {
            forceFormData: true,
            preserveScroll: true,
            onError: () => {
                queueOffline({ action: nextAction, latitude: location.latitude, longitude: location.longitude });
                setOfflinePunches(readOfflinePunches());
            },
            onSuccess: () => {
                setSelfie(null);
                setSelfiePreview(null);
            },
        });
    }

    function queueOffline(punch: Omit<OfflinePunch, 'id' | 'createdAt'>) {
        const punches = readOfflinePunches();
        punches.push({ ...punch, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
        window.localStorage.setItem(offlineKey, JSON.stringify(punches));
    }

    function clearSyncedQueue() {
        window.localStorage.removeItem(offlineKey);
        setOfflinePunches([]);
    }

    return (
        <AppLayout>
            <Head title="My Attendance" />

            <div className="mx-auto flex max-w-6xl flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">My Attendance</h1>
                    <p className="mt-1 text-sm text-zinc-600">Check in and out with selfie, GPS, site validation, and offline awareness.</p>
                </div>

                <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <SafeAvatar name={employee?.full_name ?? '--'} src={employee?.avatar_url} className="h-16 w-16 text-lg" />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{employee?.employee_number ?? 'No employee link'}</p>
                                    <h2 className="mt-1 text-xl font-semibold">{employee?.full_name ?? 'Employee profile not linked'}</h2>
                                    <p className="mt-2 text-sm text-zinc-600">{employee?.position?.title ?? 'No position'} in {employee?.department?.name ?? 'No department'}</p>
                                </div>
                            </div>
                            <Badge value={todayRecord?.status ?? 'not_started'} />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <Metric label="Work Date" value={formatDate(workDate)} />
                            <Metric label="Clock In" value={formatTime(todayRecord?.clock_in_at)} />
                            <Metric label="Clock Out" value={formatTime(todayRecord?.clock_out_at)} />
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                <video ref={videoRef} className="aspect-video w-full rounded-md bg-zinc-950 object-cover" autoPlay playsInline muted />
                                <canvas ref={canvasRef} className="hidden" />
                                <input ref={selfieInputRef} className="hidden" type="file" accept="image/*" capture="user" onChange={selectSelfie} />
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold" type="button" onClick={startCamera}>
                                        <Camera size={16} /> Start Camera
                                    </button>
                                    <button className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={captureSelfie}>
                                        <Camera size={16} /> Capture Selfie
                                    </button>
                                    <button className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold" type="button" onClick={() => selfieInputRef.current?.click()}>
                                        <UploadCloud size={16} /> Upload Photo
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-zinc-600">{cameraStatus}</p>
                                {selfiePreview && <img src={selfiePreview} alt="Selfie preview" className="mt-3 h-28 w-28 rounded-md object-cover" />}
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={captureGps}>
                                    <LocateFixed size={16} /> Capture GPS
                                </button>
                                <p className="mt-3 text-sm font-medium text-zinc-900">{location.message}</p>
                                <div className="mt-3 grid gap-2 text-sm">
                                    <Detail label="Latitude" value={location.latitude?.toFixed(7) ?? '--'} />
                                    <Detail label="Longitude" value={location.longitude?.toFixed(7) ?? '--'} />
                                    <Detail label="Nearest Site" value={siteMessage} />
                                    <Detail label="Distance" value={detectedSite ? `${detectedSite.distance.toFixed(1)}m` : formatDistance(todayRecord?.distance_from_site)} />
                                    <Detail label="Zone" value={detectedSite?.zone ?? todayRecord?.zone_status ?? 'unknown'} />
                                </div>
                                {! employee?.has_project_site_assignment && hasActiveProjectSites && (
                                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                        You are not assigned to a specific site yet, so the app is using all active company sites for detection.
                                    </p>
                                )}
                            </div>
                        </div>

                        {punchForm.progress && (
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                                <div className="h-full bg-blue-600" style={{ width: `${punchForm.progress.percentage}%` }} />
                            </div>
                        )}

                        <button
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-4 text-base font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={! canPunch}
                            onClick={submitPunch}
                            type="button"
                        >
                            <UploadCloud size={20} /> {hasClockedIn ? 'Check Out With Selfie + GPS' : 'Check In With Selfie + GPS'}
                        </button>
                    </div>

                    <aside className="rounded-lg border border-zinc-200 bg-white p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Today</h2>
                        <dl className="mt-4 space-y-4">
                            <Detail label="Late After" value={lateAfter} />
                            <Detail label="Shift" value={employee?.shift?.name ?? 'Default day shift'} />
                            <Detail label="Worked Time" value={formatMinutes(todayRecord?.worked_minutes)} />
                            <Detail label="Approval" value={todayRecord?.approval_status ?? 'Not submitted'} />
                            <Detail label="Overtime" value={`${todayRecord?.overtime_hours ?? 0}h`} />
                        </dl>

                        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                                <RefreshCcw size={16} /> Offline Queue
                            </div>
                            <p className="mt-2 text-sm text-amber-800">
                                {offlinePunches.length
                                    ? `${offlinePunches.length} punch item(s) saved locally. Selfie upload still requires an online retry.`
                                    : 'No offline punch waiting to sync.'}
                            </p>
                            {offlinePunches.length > 0 && (
                                <button className="mt-3 rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900" type="button" onClick={clearSyncedQueue}>
                                    Clear after manual sync
                                </button>
                            )}
                        </div>
                    </aside>
                </section>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Request Attendance Correction</h2>
                    <div className="mt-4 grid gap-3 lg:grid-cols-5">
                        <select className="form-input" value={correctionForm.data.type} onChange={(event) => correctionForm.setData('type', event.target.value)}>
                            <option value="missed_check_in">Missed check-in</option>
                            <option value="missed_check_out">Missed check-out</option>
                            <option value="wrong_time">Wrong time</option>
                            <option value="wrong_location">Wrong location</option>
                            <option value="other">Other</option>
                        </select>
                        <input className="form-input" type="date" value={correctionForm.data.work_date} onChange={(event) => correctionForm.setData('work_date', event.target.value)} />
                        <input className="form-input" type="datetime-local" value={correctionForm.data.requested_clock_in_at} onChange={(event) => correctionForm.setData('requested_clock_in_at', event.target.value)} />
                        <input className="form-input" type="datetime-local" value={correctionForm.data.requested_clock_out_at} onChange={(event) => correctionForm.setData('requested_clock_out_at', event.target.value)} />
                        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => correctionForm.post('/self-service/attendance-corrections', { preserveScroll: true })}>
                            Submit
                        </button>
                    </div>
                    <textarea className="form-input mt-3 min-h-24 w-full" placeholder="Explain what needs to be corrected" value={correctionForm.data.reason} onChange={(event) => correctionForm.setData('reason', event.target.value)} />
                </section>

                <RecentRecords records={recentRecords} />
            </div>
        </AppLayout>
    );
}

function RecentRecords({ records }: { records: AttendanceRecord[] }) {
    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent Attendance</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Clock In</th>
                            <th className="px-4 py-3">Clock Out</th>
                            <th className="px-4 py-3">Site</th>
                            <th className="px-4 py-3">Zone</th>
                            <th className="px-4 py-3">Approval</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {records.map((record) => (
                            <tr key={`${record.work_date}-${record.id ?? 'new'}`}>
                                <td className="px-4 py-3 font-medium">{formatDate(record.work_date)}</td>
                                <td className="px-4 py-3 text-zinc-700">{formatTime(record.clock_in_at)}</td>
                                <td className="px-4 py-3 text-zinc-700">{formatTime(record.clock_out_at)}</td>
                                <td className="px-4 py-3 text-zinc-700">{record.project_site?.name ?? '--'}</td>
                                <td className="px-4 py-3"><Badge value={record.zone_status ?? 'unknown'} /></td>
                                <td className="px-4 py-3"><Badge value={record.approval_status ?? 'pending'} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-zinc-900">{value}</dd>
        </div>
    );
}

function Badge({ value }: { value: string }) {
    const classes = {
        not_started: 'bg-zinc-100 text-zinc-600',
        present: 'bg-emerald-50 text-emerald-700',
        late: 'bg-amber-50 text-amber-700',
        absent: 'bg-rose-50 text-rose-700',
        in_zone: 'bg-emerald-50 text-emerald-700',
        out_of_zone: 'bg-rose-50 text-rose-700',
        approved: 'bg-emerald-50 text-emerald-700',
        pending: 'bg-amber-50 text-amber-700',
        rejected: 'bg-rose-50 text-rose-700',
    }[value] ?? 'bg-zinc-100 text-zinc-600';

    return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(value)}</span>;
}

function detectSite(sites: ProjectSite[], latitude: number | null, longitude: number | null) {
    if (latitude === null || longitude === null || sites.length === 0) {
        return null;
    }

    return sites
        .map((site) => {
            const distance = distanceMeters(Number(site.latitude), Number(site.longitude), latitude, longitude);
            return { site, distance, zone: distance <= site.geofence_radius_meters ? 'in_zone' : 'out_of_zone' };
        })
        .sort((a, b) => a.distance - b.distance)[0];
}

function siteStatusMessage(hasActiveSites: boolean, hasAssignment: boolean, detectedName?: string, recordedName?: string) {
    if (detectedName || recordedName) {
        return detectedName ?? recordedName ?? '--';
    }

    if (! hasActiveSites) {
        return 'No active project sites have been configured.';
    }

    if (! hasAssignment) {
        return 'Capture GPS to detect the nearest active company site.';
    }

    return 'Capture GPS to detect your assigned site.';
}

function distanceMeters(siteLat: number, siteLng: number, lat: number, lng: number) {
    const earthRadius = 6371000;
    const dLat = toRadians(lat - siteLat);
    const dLng = toRadians(lng - siteLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(siteLat)) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) ** 2;
    return earthRadius * 2 * Math.asin(Math.sqrt(a));
}

function toRadians(value: number) {
    return value * Math.PI / 180;
}

function readOfflinePunches(): OfflinePunch[] {
    try {
        return JSON.parse(window.localStorage.getItem(offlineKey) ?? '[]');
    } catch {
        return [];
    }
}

function formatDate(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set';
}

function formatTime(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--';
}

function formatMinutes(value?: number) {
    if (! value) {
        return '0h 0m';
    }

    return `${Math.floor(value / 60)}h ${value % 60}m`;
}

function formatDistance(value?: string | number | null) {
    return value === null || value === undefined ? '--' : `${Number(value).toFixed(1)}m`;
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
