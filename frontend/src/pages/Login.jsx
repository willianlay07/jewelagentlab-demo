
import { useState } from "react";
import {
    useNavigate,
    Navigate,
    useSearchParams
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { errorText } from "../api/axios";
import { Gem } from "lucide-react";

export default function Login() {
    const { user, signIn } = useAuth();

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const sessionExpired =
        searchParams.get("reason") === "session-expired";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    async function submit(e) {
        e.preventDefault();

        setBusy(true);
        setError("");

        try {
            await signIn(email, password);
            navigate("/dashboard", { replace: true });
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#edf0f2]">
            <form
                onSubmit={submit}
                className="card w-full max-w-md p-5 sm:p-9 shadow-sm"
            >
                <div className="flex gap-3 items-center mb-7">
                    <Gem
                        size={34}
                        className="text-[#ad926a]"
                    />

                    <div>
                        <h1 className="text-2xl font-bold tracking-widest">
                            ORRO
                        </h1>

                        <p className="muted text-sm">
                            Jewellery AI Sales Assistant
                        </p>
                    </div>
                </div>

                <h2 className="font-semibold text-xl mb-5">
                    Staff Sign In
                </h2>

                {sessionExpired && !error && (
                    <div
                        className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                        role="alert"
                    >
                        Your session has expired. Please log in again to continue.
                    </div>
                )}

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <label className="label">
                    Email
                </label>

                <input
                    className="field mb-4"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <label className="label">
                    Password
                </label>

                <input
                    className="field mb-6"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    disabled={busy}
                    className="btn w-full"
                >
                    {busy ? "Signing in..." : "Sign In"}
                </button>
            </form>
        </div>
    );
}
