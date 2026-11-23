import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

import {
    listProducts,
    updateProduct,
    submitProduct
} from "../api/productApi";

import { asList } from "../utils/products";
import { errorText } from "../api/axios";
import ProductCard from "../components/ProductCard";

const categories = ["ring", "necklace", "earrings", "bracelet", "bangle"];

export default function ProductList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: "",
        category: "ring",
        silver_price: "",
        gold_price: "",
        description: "",
        attributes: "{}"
    });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");

    const { user } = useAuth();

    function canEditProduct(product) {
        if (!user) return false;

        if (user.role === "admin") return true;

        return (
            product.created_by === user.id &&
            ["draft", "rejected"].includes(product.status)
        );
    }

    async function load() {
        try {
            const data = await listProducts();
            setItems(asList(data));
        } catch (e) {
            setError(errorText(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function openEditor(product) {
        setEditing(product);
        setEditError("");
        setForm({
            name: product.name || "",
            category: product.category || "ring",
            silver_price: product.silver_price == null ? "" : String(product.silver_price),
            gold_price: product.gold_price == null ? "" : String(product.gold_price),
            description: product.description || "",
            attributes: JSON.stringify(product.attributes || {}, null, 2)
        });
    }

    function field(key, value) {
        setForm((previous) => ({
            ...previous,
            [key]: value
        }));
    }

    async function save(e) {
        e.preventDefault();
        if (!editing || saving) return;

        setEditError("");
        setMessage("");

        let attributes;
        try {
            attributes = JSON.parse(form.attributes);
            if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
                setEditError("Attributes must be a JSON object.");
                return;
            }
        } catch {
            setEditError("Invalid attributes JSON.");
            return;
        }

        if (!form.name.trim() || (form.silver_price === "" && form.gold_price === "") ||
            [form.silver_price, form.gold_price].some((v) => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0))) {
            setEditError("Enter a product name and at least one valid non-negative metal price.");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateProduct(editing.id, {
                name: form.name.trim(),
                category: form.category,
                silver_price: form.silver_price === "" ? null : Number(form.silver_price),
                gold_price: form.gold_price === "" ? null : Number(form.gold_price),
                description: form.description,
                attributes
            });

            setEditing(null);
            setMessage(
                updated.status === "pending"
                    ? "Product updated successfully. It is now pending approval."
                    : "Product updated successfully."
            );
            await load();
        } catch (e) {
            setEditError(errorText(e));
        } finally {
            setSaving(false);
        }
    }

    async function submit(id) {
        setError("");
        setMessage("");
        try {
            await submitProduct(id);
            setMessage("Product submitted for approval.");
            await load();
        } catch (e) {
            setError(errorText(e));
        }
    }

    return (
        <>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Products</h1>
            <p className="muted mb-6">Manage accessible products and view approval status.</p>

            {error && <div className="error" role="alert">{error}</div>}
            {message && <div className="success" role="status">{message}</div>}

            {loading ? (
                <p>Loading...</p>
            ) : items.length === 0 ? (
                <div className="card">No products yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {items.map((product) => (
                        <div key={product.id} className="min-w-0">
                            <ProductCard product={product} />
                            {(canEditProduct(product) ||
                                (["draft", "rejected"].includes(product.status) &&
                                    (user?.role === "admin" || product.created_by === user?.id))) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {canEditProduct(product) && (
                                        <button
                                            type="button"
                                            className="btn-light text-sm"
                                            onClick={() => openEditor(product)}
                                        >
                                            Edit Product
                                        </button>
                                    )}

                                    {["draft", "rejected"].includes(product.status) &&
                                        (user?.role === "admin" || product.created_by === user?.id) && (
                                            <button
                                                type="button"
                                                className="btn text-sm"
                                                onClick={() => submit(product.id)}
                                            >
                                                Submit
                                            </button>
                                        )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
                    <form
                        onSubmit={save}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-product-title"
                        className="card w-full max-w-2xl max-h-[90dvh] overflow-y-auto space-y-4"
                    >
                        <h2 id="edit-product-title" className="font-bold text-lg">
                            Edit Product — {editing.code}
                        </h2>

                        {editError && <div className="error" role="alert">{editError}</div>}

                        <div>
                            <label className="label" htmlFor="edit-name">Product Name</label>
                            <input
                                id="edit-name"
                                className="field"
                                required
                                value={form.name}
                                onChange={(e) => field("name", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label" htmlFor="edit-category">Category</label>
                                <select
                                    id="edit-category"
                                    className="field"
                                    value={form.category}
                                    onChange={(e) => field("category", e.target.value)}
                                >
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            {["silver_price", "gold_price"].map((key) => (
                                <div key={key}>
                                    <label className="label" htmlFor={`edit-${key}`}>
                                        {key === "silver_price" ? "Silver Price (SGD)" : "Gold Price (SGD)"}
                                    </label>
                                    <input id={`edit-${key}`} type="number" min="0" step="0.01"
                                        className="field" value={form[key]}
                                        onChange={(e) => field(key, e.target.value)} />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="label" htmlFor="edit-description">Description</label>
                            <textarea
                                id="edit-description"
                                className="field"
                                rows={4}
                                value={form.description}
                                onChange={(e) => field("description", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="edit-attributes">Attributes (JSON)</label>
                            <textarea
                                id="edit-attributes"
                                className="field font-mono text-xs sm:text-sm"
                                rows={9}
                                spellCheck={false}
                                value={form.attributes}
                                onChange={(e) => field("attributes", e.target.value)}
                            />
                        </div>

                        {editing.status === "approved" && (
                            <p className="text-sm text-amber-700">
                                Editing an approved product will move it to pending approval.
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button type="submit" className="btn" disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                type="button"
                                className="btn-light"
                                disabled={saving}
                                onClick={() => setEditing(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
