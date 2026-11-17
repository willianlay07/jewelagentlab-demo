
import {
    useEffect,
    useState
} from "react";

import {
    listStaff,
    createStaff,
    updateStaff
} from "../api/staffApi";

import { asList } from "../utils/products";
import { errorText } from "../api/axios";

export default function StaffManagement() {
    const [items, setItems] = useState([]);

    const [form, setForm] = useState({
        email: "",
        full_name: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function load() {
        try {
            const d = await listStaff();

            setItems(
                Array.isArray(d)
                    ? d
                    : asList(d)
            );
        } catch (e) {
            setError(errorText(e));
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function create(e) {
        e.preventDefault();

        setError("");

        try {
            await createStaff(form);

            setMessage("Staff created.");

            setForm({
                email: "",
                full_name: "",
                password: ""
            });

            load();
        } catch (e) {
            setError(errorText(e));
        }
    }

    async function toggle(u) {
        setError("");

        try {
            await updateStaff(u.id, {
                is_active: !u.is_active
            });

            load();
        } catch (e) {
            setError(errorText(e));
        }
    }

    return (
        <>
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">
                Staff Management
            </h1>

            {/* Error Message */}
            {error && (
                <div className="error">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {message && (
                <div className="success">
                    {message}
                </div>
            )}

            {/* Create Staff Form */}
            <form
                onSubmit={create}
                className="card max-w-xl space-y-3"
            >
                <h2 className="font-semibold">
                    Create Staff Account
                </h2>

                {[
                    ["full_name", "Full Name"],
                    ["email", "Email"],
                    ["password", "Password"]
                ].map(([key, label]) => (
                    <div key={key}>
                        <label className="label">
                            {label}
                        </label>

                        <input
                            className="field"
                            type={
                                key === "password"
                                    ? "password"
                                    : key === "email"
                                        ? "email"
                                        : "text"
                            }
                            required
                            value={form[key]}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    [key]: e.target.value
                                }))
                            }
                        />
                    </div>
                ))}

                <button className="btn">
                    Create Staff
                </button>
            </form>

            {/* Staff Accounts List */}
            <div className="card mt-6">
                <h2 className="font-semibold mb-4">
                    Staff Accounts
                </h2>

                {items.map((u) => (
                    <div
                        key={u.id}
                        className="flex flex-col items-start gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        {/* Staff Information */}
                        <div>
                            <div className="font-medium">
                                {u.full_name || u.email}
                            </div>

                            <div className="text-sm muted break-all">
                                {u.email} · {u.is_active ? "Active" : "Disabled"}
                            </div>
                        </div>

                        {/* Enable / Disable Button */}
                        <button
                            className="btn-light text-sm w-full sm:w-auto"
                            onClick={() => toggle(u)}
                        >
                            {u.is_active ? "Disable" : "Enable"}
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
