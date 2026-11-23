import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

import {
    listProducts,
    updateProduct,
    submitProduct,
    uploadImages,
    analyzeProduct
} from "../api/productApi";

import { X } from "lucide-react";
import { asList } from "../utils/products";
import { errorText } from "../api/axios";
import ProductCard from "../components/ProductCard";
import { imageUrl } from "../utils/products";

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
    const [imageFiles, setImageFiles] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [analyzingImages, setAnalyzingImages] = useState(false);

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
        setImageFiles([]);

        setForm({
            name: product.name || "",
            category: product.category || "ring",
            silver_price: product.silver_price == null ? "" : String(product.silver_price),
            gold_price: product.gold_price == null ? "" : String(product.gold_price),
            description: product.description || "",
            attributes: JSON.stringify(product.attributes || {}, null, 2)
        });
    }

    async function handleImageUpload() {
        if (!editing || imageFiles.length === 0) return;

        setUploadingImages(true);
        setEditError("");

        try {
            const updated = await uploadImages(editing.id, imageFiles);

            setEditing(updated);
            setImageFiles([]);
            await load();

            setMessage("Product images uploaded successfully.");
        } catch (e) {
            setEditError(errorText(e));
        } finally {
            setUploadingImages(false);
        }
    }

    async function handleImageAnalysis() {
        if (!editing || !editing.images?.length) return;

        setAnalyzingImages(true);
        setEditError("");

        try {
            const data = await analyzeProduct(editing.id);

            const attrs =
                data.attributes ||
                data.suggested_attributes ||
                data.suggestions ||
                data;

            setForm((previous) => ({
                ...previous,
                attributes: JSON.stringify(attrs, null, 2)
            }));

            setMessage("AI analysis completed. Review the suggested attributes before saving.");
        } catch (e) {
            setEditError(errorText(e));
        } finally {
            setAnalyzingImages(false);
        }
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

        const product = items.find((p) => p.id === id);

        if (!product?.images?.length) {
            setError("Please upload at least one product image before submitting.");
            return;
        }

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
                                            <div>
                                                <button
                                                    type="button"
                                                    className="btn text-sm"
                                                    disabled={!product.images?.length}
                                                    onClick={() => submit(product.id)}
                                                >
                                                    Submit
                                                </button>

                                                {!product.images?.length && (
                                                    <p className="text-xs text-amber-700 mt-1">
                                                        Upload at least one image before submitting.
                                                    </p>
                                                )}
                                            </div>
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
                        <div className="flex items-center justify-between gap-4">
                            <h2
                                id="edit-product-title"
                                className="font-bold text-lg"
                            >
                                Edit Product — {editing.code}
                            </h2>

                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                disabled={saving || uploadingImages || analyzingImages}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                                aria-label="Close product editor"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

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

                        <div className="space-y-3">
                            <label className="label">
                                Product Images ({editing.images?.length || 0}/8)
                            </label>

                            {editing.images?.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {editing.images.map((image, index) => (
                                        <div
                                            key={image.id ?? index}
                                            className="rounded-lg border bg-white p-2"
                                        >
                                            <img
                                                src={imageUrl(image)}
                                                alt={`Product image ${index + 1}`}
                                                className="h-28 w-full object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-amber-700">
                                    No images uploaded. Upload at least one image
                                    before submitting for approval.
                                </p>
                            )}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="field"
                                disabled={uploadingImages || saving}
                                onChange={(e) =>
                                    setImageFiles(Array.from(e.target.files || []))
                                }
                            />

                            <button
                                type="button"
                                className="btn-light"
                                disabled={
                                    uploadingImages ||
                                    saving ||
                                    imageFiles.length === 0 ||
                                    (editing.images?.length || 0) + imageFiles.length > 8
                                }
                                onClick={handleImageUpload}
                            >
                                {uploadingImages ? "Uploading..." : "Upload Images"}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="label">AI Image Analysis</label>

                            <button
                                type="button"
                                className="btn-light"
                                disabled={
                                    analyzingImages ||
                                    uploadingImages ||
                                    saving ||
                                    !editing.images?.length
                                }
                                onClick={handleImageAnalysis}
                            >
                                {analyzingImages
                                    ? "Analyzing Images..."
                                    : "Analyze Product Images"}
                            </button>

                            <p className="text-xs muted">
                                AI will suggest jewellery attributes based on the uploaded images.
                                Review the suggestions before saving.
                            </p>
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
