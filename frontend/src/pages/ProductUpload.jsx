
import { useEffect, useState } from "react";
import { LoaderCircle, CheckCircle2, AlertCircle, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    createProduct,
    uploadImages,
    analyzeProduct,
    updateProduct,
    submitProduct
} from "../api/productApi";

import { errorText } from "../api/axios";
import { imageUrl } from "../utils/products";

const initial = {
    code: "",
    name: "",
    category: "ring",
    silver_price: "",
    gold_price: "",
    description: "",
    attributes: {}
};

export default function ProductUpload() {
    const navigate = useNavigate();

    const [form, setForm] = useState(initial);
    const [files, setFiles] = useState([]);
    const [productId, setProductId] = useState(null);
    const [attributes, setAttributes] = useState("{}");
    const [attributesSaved, setAttributesSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [operation, setOperation] = useState("");
    const [previews, setPreviews] = useState([]);
    const [uploadedImages, setUploadedImages] = useState([]);

    useEffect(() => {
        const urls = Array.from(files).map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file)
        }));
        setPreviews(urls);
        return () => urls.forEach((item) => URL.revokeObjectURL(item.url));
    }, [files]);

    function beginOperation(name) {
        setBusy(true);
        setOperation(name);
        setError("");
        setMessage("");
    }

    function endOperation() {
        setBusy(false);
        setOperation("");
    }

    function Spinner() {
        return <LoaderCircle size={17} className="animate-spin shrink-0" aria-hidden="true" />;
    }

    function field(key, value) {
        setForm((p) => ({
            ...p,
            [key]: value
        }));
    }

    async function create() {
        beginOperation("creating");

        try {
            const data = await createProduct({
                ...form,
                silver_price: form.silver_price === "" ? null : Number(form.silver_price),
                gold_price: form.gold_price === "" ? null : Number(form.gold_price),
                attributes: {}
            });

            setProductId(data.id);

            setMessage(
                `Draft #${data.id} created. Upload photos next.`
            );
        } catch (e) {
            setError(errorText(e));
        } finally {
            endOperation();
        }
    }

    async function upload() {
        if (!files.length) {
            return setError("Choose at least one image.");
        }

        beginOperation("uploading");

        try {
            const updatedProduct = await uploadImages(productId, files);
            setUploadedImages(updatedProduct.images || []);
            setFiles([]);

            setMessage(
                "Photos uploaded. You can analyze them now."
            );
        } catch (e) {
            setError(errorText(e));
        } finally {
            endOperation();
        }
    }

    async function analyze() {
        beginOperation("analyzing");

        try {
            const data = await analyzeProduct(productId);

            setAnalysis(data);

            const attrs =
                data.attributes ||
                data.suggested_attributes ||
                data.suggestions ||
                data;

            setAttributes(
                JSON.stringify(attrs, null, 2)
            );

            setAttributesSaved(false);

            setMessage(
                "AI suggestions loaded. Review them before saving."
            );
        } catch (e) {
            setError(errorText(e));
        } finally {
            endOperation();
        }
    }

    async function save() {
        beginOperation("saving");

        try {
            const attrs = JSON.parse(attributes);

            await updateProduct(productId, {
                attributes: attrs
            });

            setAttributesSaved(true);

            setMessage(
                "Attributes saved. Ready for submission."
            );
        } catch (e) {
            setError(
                e instanceof SyntaxError
                    ? "Invalid attributes JSON"
                    : errorText(e)
            );
        } finally {
            endOperation();
        }
    }

    async function submit() {
        beginOperation("submitting");

        try {
            await submitProduct(productId);

            navigate("/products");
        } catch (e) {
            setError(errorText(e));
        } finally {
            endOperation();
        }
    }

    return (
        <div className="w-full min-w-0 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Upload Jewellery
            </h1>

            <p className="muted mb-6">
                Create draft → Upload images → AI analysis → Review → Submit for approval
            </p>

            <div aria-live="polite" aria-atomic="true">
                {error && (
                    <div className="error flex items-start gap-2" role="alert">
                        <AlertCircle size={19} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                {message && (
                    <div className="success flex items-start gap-2" role="status">
                        <CheckCircle2 size={19} className="shrink-0 mt-0.5" />
                        <span>{message}</span>
                    </div>
                )}
                {busy && (
                    <div className="my-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
                        <Spinner />
                        <span>{({
                            creating: "Creating product draft...",
                            uploading: "Uploading jewellery images. Please wait...",
                            analyzing: "AI is analyzing your jewellery images. This may take a while...",
                            saving: "Saving reviewed attributes...",
                            submitting: "Submitting product for approval..."
                        })[operation] || "Processing..."}</span>
                    </div>
                )}
            </div>

            {/* Step 1: Product Details */}
            <div className="card space-y-4">
                <h2 className="font-semibold text-lg">
                    1. Product Details
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                        ["code", "Product Code"],
                        ["name", "Product Name"]
                    ].map(([key, label]) => (
                        <div key={key}>
                            <label className="label">
                                {label}
                            </label>

                            <input
                                className="field"
                                value={form[key]}
                                disabled={!!productId}
                                onChange={(e) =>
                                    field(key, e.target.value)
                                }
                            />
                        </div>
                    ))}

                    <div>
                        <label className="label">
                            Category
                        </label>

                        <select
                            className="field"
                            disabled={!!productId}
                            value={form.category}
                            onChange={(e) =>
                                field("category", e.target.value)
                            }
                        >
                            {[
                                "ring",
                                "necklace",
                                "earrings",
                                "bracelet",
                                "bangle"
                            ].map((c) => (
                                <option key={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    {["silver_price", "gold_price"].map((key) => (
                        <div key={key}>
                            <label className="label">{key === "silver_price" ? "Silver Price (SGD)" : "Gold Price (SGD)"}</label>
                            <input type="number" min="0" step="0.01" className="field"
                                disabled={!!productId} value={form[key]}
                                onChange={(e) => field(key, e.target.value)} />
                        </div>
                    ))}
                </div>

                <div>
                    <label className="label">
                        Description
                    </label>

                    <textarea
                        className="field"
                        rows="3"
                        disabled={!!productId}
                        value={form.description}
                        onChange={(e) =>
                            field("description", e.target.value)
                        }
                    />
                </div>

                <button
                    className="btn inline-flex items-center justify-center gap-2"
                    disabled={
                        busy ||
                        !!productId ||
                        !form.code ||
                        !form.name ||
                        (form.silver_price === "" && form.gold_price === "")
                    }
                    onClick={create}
                >
                    {operation === "creating" ? <><Spinner /> Creating...</> : "Create Draft"}
                </button>
            </div>

            {productId && (
                <>
                    {/* Step 2: Upload Photos */}
                    <div className="card mt-5 space-y-4">
                        <h2 className="font-semibold text-lg">
                            2. Upload Photos
                        </h2>

                        <input
                            className="field"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        />

                        {previews.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Selected photos ({previews.length})</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {previews.map((item, index) => (
                                        <div key={item.url} className="min-w-0">
                                            <img src={item.url} alt={`Selected photo ${index + 1}`} className="h-32 w-full rounded-lg border bg-white object-contain" />
                                            <p className="text-xs muted mt-1 truncate" title={item.name}>{item.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            className="btn inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                            disabled={busy || !files.length}
                            onClick={upload}
                        >
                            {operation === "uploading" ? <><Spinner /> Uploading...</> : "Upload Photos"}
                        </button>

                        {uploadedImages.length > 0 && (
                            <div>
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <Images size={17} /> Uploaded photos ({uploadedImages.length})
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {uploadedImages.map((image, index) => (
                                        <div key={image.id ?? index} className="rounded-lg border bg-white p-2">
                                            <img
                                                src={imageUrl(image)}
                                                alt={`Uploaded jewellery ${index + 1}`}
                                                className="h-32 w-full object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: AI Analysis */}
                    <div className="card mt-5 space-y-4">
                        <h2 className="font-semibold text-lg">
                            3. AI Analysis & Review
                        </h2>

                        <button
                            className="btn-light inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                            disabled={busy}
                            onClick={analyze}
                        >
                            {operation === "analyzing" ? <><Spinner /> Analyzing...</> : "Analyze Product Images"}
                        </button>

                        {analysis && (
                            <p className="text-xs muted">
                                AI suggestions require human verification.
                            </p>
                        )}

                        <label className="label">
                            Product Attributes (JSON)
                        </label>

                        
                        <textarea
                            className="field min-w-0 font-mono text-xs sm:text-sm"
                            rows="12"
                            value={attributes}
                            onChange={(e) => {
                                setAttributes(e.target.value);
                                setAttributesSaved(false);
                            }}
                        />

                        <button
                            type="button"
                            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors w-full sm:w-auto ${
                                attributesSaved
                                    ? "bg-[#93999D] text-white cursor-not-allowed"
                                    : "btn-light"
                            }`}
                            disabled={busy || attributesSaved}
                            onClick={save}
                        >
                            {operation === "saving" ? (
                                <>
                                    <Spinner />
                                    Saving...
                                </>
                            ) : attributesSaved ? (
                                <>
                                    <CheckCircle2 size={17} />
                                    Attributes Saved
                                </>
                            ) : (
                                "Save Reviewed Attributes"
                            )}
                        </button>

                    </div>

                    {/* Step 4: Submit for Approval */}
                    <div className="card mt-5">
                        <h2 className="font-semibold mb-3">
                            4. Submit for Admin Approval
                        </h2>

                        <button
                            className="btn inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                            disabled={busy}
                            onClick={submit}
                        >
                            {operation === "submitting" ? <><Spinner /> Submitting...</> : "Submit Product"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
