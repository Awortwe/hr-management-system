import { useForm, usePage } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import type { PageProps } from '../../types';
import type { FormEvent } from 'react';

export default function Login() {
    const { company } = usePage<PageProps>().props;
    const form = useForm({ email: '', password: '', remember: false });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/login', { onFinish: () => form.reset('password') });
    }
    return (
        <main className="grid min-h-screen place-items-center bg-zinc-50 px-5 py-10 text-zinc-950">
            <Head title="Sign In" />
            <form className="w-full max-w-sm space-y-5" onSubmit={submit}>
                <h1 className="break-words text-3xl font-semibold">{company.name}</h1>
                <p className="text-zinc-600">Sign in to your account</p>
                <label className="block text-sm font-medium">
                    Email
                    <input
                        className="form-input mt-2"
                        autoComplete="username"
                        autoFocus
                        type="email"
                        required
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                    />
                </label>
                <label className="block text-sm font-medium">
                    Password
                    <input
                        className="form-input mt-2"
                        autoComplete="current-password"
                        type="password"
                        required
                        value={form.data.password}
                        onChange={(event) =>
                            form.setData('password', event.target.value)
                        }
                    />
                </label>
                {Object.values(form.errors).map((error) => (
                    <p
                        role="alert"
                        className="text-sm text-rose-700"
                        key={error}
                    >
                        {error}
                    </p>
                ))}
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.data.remember}
                        onChange={(event) =>
                            form.setData('remember', event.target.checked)
                        }
                    />
                    Remember me
                </label>
                <button
                    className="w-full rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white disabled:opacity-50"
                    disabled={form.processing}
                >
                    Sign In
                </button>
            </form>
        </main>
    );
}
