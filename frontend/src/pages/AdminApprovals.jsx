
import {
    useEffect,
    useState
} from "react";

import {
    pendingApprovals,
    approveProduct,
    rejectProduct
} from "../api/approvalApi";

import { asList } from "../utils/products";
import { errorText } from "../api/axios";
import ProductCard from "../components/ProductCard";

export default function AdminApprovals() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function load() {
        try {
            const data = await pendingApprovals();

            setItems(asList(data));
        } catch (e) {
            setError(errorText(e));
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function approve(id) {
        setBusy(true);
        setError("");

        try {
            await approveProduct(id);

            await load();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    }

    async function reject(id) {
        const reason = window.prompt(
            "Reason for rejection:"
        );

        if (!reason?.trim()) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            await rejectProduct(
                id,
                reason.trim()
            );

            await load();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-2">
                Pending Approvals
            </h1>

            <p className="muted mb-6">
                Review product information before making it searchable.
            </p>

            {/* Error Message */}
            {error && (
                <div className="error">
                    {error}
                </div>
            )}

            {/* Pending Products */}
            {items.length === 0 ? (
                <div className="card">
                    No pending products.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((p) => (
                        <div key={p.id}>
                            <ProductCard product={p} />

                            <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                    className="btn"
                                    disabled={busy}
                                    onClick={() =>
                                        approve(p.id)
                                    }
                                >
                                    Approve
                                </button>

                                <button
                                    className="btn-light"
                                    disabled={busy}
                                    onClick={() =>
                                        reject(p.id)
                                    }
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
