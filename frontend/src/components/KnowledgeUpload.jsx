
import { useEffect, useRef, useState } from "react";
import {
    UploadCloud,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Search,
    X,
    ChevronDown,
} from "lucide-react";

import {
    uploadKnowledgeDocument,
    getKnowledgeDocuments,
} from "../api/knowledgeApi";

import { errorText } from "../api/axios";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

export default function KnowledgeUpload({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");
    const [visibility, setVisibility] = useState("all_users");

    const [uploadType, setUploadType] = useState("new");
    const [previousDocumentId, setPreviousDocumentId] = useState("");
    const [documentSearch, setDocumentSearch] = useState("");
    const [showDocumentOptions, setShowDocumentOptions] = useState(false);
    const [effectiveFrom, setEffectiveFrom] = useState("");

    const [documents, setDocuments] = useState([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fileInputRef = useRef(null);
    const searchContainerRef = useRef(null);

    // Load existing documents.
    useEffect(() => {
        let cancelled = false;

        async function loadDocuments() {
            setLoadingDocuments(true);

            try {
                const data = await getKnowledgeDocuments();

                if (!cancelled) {
                    setDocuments(
                        Array.isArray(data) ? data : []
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(errorText(err));
                }
            } finally {
                if (!cancelled) {
                    setLoadingDocuments(false);
                }
            }
        }

        loadDocuments();

        return () => {
            cancelled = true;
        };
    }, []);

    // Close search results when clicking outside.
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target)
            ) {
                setShowDocumentOptions(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    // Only current versions can be replaced.
    const replaceableDocuments = documents.filter(
        (doc) => doc.status === "current"
    );

    // Search by title, filename, version or document ID.
    const filteredDocuments = replaceableDocuments.filter(
        (doc) => {
            const search = documentSearch
                .trim()
                .toLowerCase();

            if (!search) {
                return true;
            }

            return (
                (doc.title || "")
                    .toLowerCase()
                    .includes(search) ||
                (doc.filename || "")
                    .toLowerCase()
                    .includes(search) ||
                `v${doc.version}`.includes(search) ||
                String(doc.id).includes(search)
            );
        }
    );

    const selectedPrevious = documents.find(
        (doc) => String(doc.id) === previousDocumentId
    );

    function handleFileChange(event) {
        const selected = event.target.files?.[0] || null;

        setError("");
        setSuccess("");

        if (!selected) {
            setFile(null);
            return;
        }

        const extension = selected.name
            .slice(selected.name.lastIndexOf("."))
            .toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setError(
                "Supported formats: PDF, DOCX, TXT, MD."
            );
            setFile(null);
            event.target.value = "";
            return;
        }

        if (selected.size > MAX_FILE_SIZE) {
            setError("Maximum file size is 10 MB.");
            setFile(null);
            event.target.value = "";
            return;
        }

        if (selected.size === 0) {
            setError("The selected file is empty.");
            setFile(null);
            event.target.value = "";
            return;
        }

        setFile(selected);

        // Suggest a title only when the field is empty.
        if (!title.trim()) {
            setTitle(
                selected.name.replace(/\.[^.]+$/, "")
            );
        }
    }

    function selectPreviousDocument(doc) {
        setPreviousDocumentId(String(doc.id));

        setDocumentSearch(
            `${doc.title} — v${doc.version}`
        );

        setShowDocumentOptions(false);

        // Keep the existing title entered by Admin.
        // Only inherit visibility from the previous document.
        setVisibility(doc.visibility);

        setError("");
    }

    function clearPreviousDocument() {
        setPreviousDocumentId("");
        setDocumentSearch("");
        setShowDocumentOptions(false);
    }

    function handleUploadTypeChange(type) {
        setUploadType(type);
        clearPreviousDocument();
        setEffectiveFrom("");
        setError("");
        setSuccess("");
    }

    function resetForm() {
        setFile(null);
        setTitle("");
        setVisibility("all_users");
        setUploadType("new");
        setPreviousDocumentId("");
        setDocumentSearch("");
        setShowDocumentOptions(false);
        setEffectiveFrom("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!file) {
            setError("Please select a document.");
            return;
        }

        if (!title.trim()) {
            setError("Please enter a document title.");
            return;
        }

        if (uploadType === "version") {
            if (!previousDocumentId || !selectedPrevious) {
                setError(
                    "Please select an existing document from the search results."
                );
                return;
            }

            if (!effectiveFrom) {
                setError(
                    "Please select the new effective date."
                );
                return;
            }

            if (
                selectedPrevious.effective_from &&
                effectiveFrom <= selectedPrevious.effective_from
            ) {
                setError(
                    "The new effective date must be later than the previous version's effective date."
                );
                return;
            }
        }

        setLoading(true);

        try {
            const result = await uploadKnowledgeDocument({
                file,
                title,
                visibility,
                previousDocumentId:
                    uploadType === "version"
                        ? previousDocumentId
                        : null,
                effectiveFrom:
                    uploadType === "version"
                        ? effectiveFrom
                        : null,
            });

            // Refresh the existing documents.
            let refreshError = false;

            try {
                const data = await getKnowledgeDocuments();

                setDocuments(
                    Array.isArray(data) ? data : []
                );
            } catch {
                refreshError = true;
            }

            resetForm();

            setSuccess(
                `Document uploaded successfully — Version ${result.version}. ` +
                "Processing and indexing are not yet automatic." +
                (refreshError
                    ? " The document list could not be refreshed."
                    : "")
            );

            onUploaded?.(result);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <UploadCloud size={23} />
                </div>

                <div>
                    <h3 className="font-bold text-slate-800">
                        Upload Knowledge Document
                    </h3>

                    <p className="text-xs text-slate-500">
                        PDF, DOCX, TXT, MD · Maximum 10 MB
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {/* Select File */}
                <div>
                    <label
                        htmlFor="knowledge-file"
                        className="label"
                    >
                        Select Document
                    </label>

                    <input
                        id="knowledge-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileChange}
                        className="field w-full bg-white"
                        disabled={loading}
                        required
                    />

                    {file && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
                            <FileText
                                size={15}
                                className="shrink-0"
                            />

                            <span className="break-all">
                                {file.name}
                            </span>

                            <span className="shrink-0 text-slate-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    )}
                </div>

                {/* Document Title */}
                <div>
                    <label
                        htmlFor="knowledge-title"
                        className="label"
                    >
                        Document Title
                    </label>

                    <input
                        id="knowledge-title"
                        type="text"
                        className="field bg-white"
                        placeholder="e.g. Exchange Policy — Updated 2026"
                        value={title}
                        onChange={(event) =>
                            setTitle(event.target.value)
                        }
                        maxLength={255}
                        required
                        disabled={loading}
                    />

                    <p className="mt-1 text-xs text-slate-500">
                        You can enter any title, including when
                        uploading a new version.
                    </p>
                </div>

                {/* Upload Type */}
                <div>
                    <label className="label">
                        Upload Type
                    </label>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label
                            className={`flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                                uploadType === "new"
                                    ? "border-blue-400 bg-white"
                                    : "border-slate-200 bg-white/60 hover:bg-white"
                            }`}
                        >
                            <input
                                type="radio"
                                name="uploadType"
                                value="new"
                                checked={uploadType === "new"}
                                onChange={() =>
                                    handleUploadTypeChange("new")
                                }
                                disabled={loading}
                                className="mr-2 accent-blue-600"
                            />

                            <span className="text-sm font-medium text-slate-800">
                                New Document
                            </span>
                        </label>

                        <label
                            className={`flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                                uploadType === "version"
                                    ? "border-blue-400 bg-white"
                                    : "border-slate-200 bg-white/60 hover:bg-white"
                            }`}
                        >
                            <input
                                type="radio"
                                name="uploadType"
                                value="version"
                                checked={uploadType === "version"}
                                onChange={() =>
                                    handleUploadTypeChange("version")
                                }
                                disabled={loading}
                                className="mr-2 accent-blue-600"
                            />

                            <span className="text-sm font-medium text-slate-800">
                                New Version
                            </span>
                        </label>
                    </div>
                </div>

                {/* Version Settings */}
                {uploadType === "version" && (
                    <div className="space-y-4 rounded-xl border border-blue-100 bg-white p-4">
                        {/* Search Existing Document */}
                        <div>
                            <label
                                htmlFor="knowledge-previous"
                                className="label"
                            >
                                Replace Existing Document
                            </label>

                            <div
                                ref={searchContainerRef}
                                className="relative"
                            >
                                <div className="relative">
                                    <Search
                                        size={17}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="knowledge-previous"
                                        type="text"
                                        className="field w-full bg-white !pl-10 !pr-20"
                                        placeholder="Type to search documents..."
                                        value={documentSearch}
                                        onChange={(event) => {
                                            setDocumentSearch(
                                                event.target.value
                                            );

                                            setPreviousDocumentId("");
                                            setShowDocumentOptions(true);
                                        }}
                                        onFocus={() =>
                                            setShowDocumentOptions(true)
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === "Escape") {
                                                setShowDocumentOptions(false);
                                            }
                                        }}
                                        disabled={loading}
                                        autoComplete="off"
                                        required
                                        role="combobox"
                                        aria-expanded={showDocumentOptions}
                                        aria-controls="knowledge-document-options"
                                        aria-autocomplete="list"
                                    />

                                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                                        {documentSearch && (
                                            <button
                                                type="button"
                                                onClick={clearPreviousDocument}
                                                disabled={loading}
                                                aria-label="Clear document selection"
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowDocumentOptions(
                                                    (open) => !open
                                                )
                                            }
                                            disabled={loading}
                                            aria-label="Show existing documents"
                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Search Results */}
                                {showDocumentOptions && (
                                    <div
                                        id="knowledge-document-options"
                                        role="listbox"
                                        className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                                    >
                                        {loadingDocuments ? (
                                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                                                <Loader2
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                                Loading documents...
                                            </div>
                                        ) : filteredDocuments.length > 0 ? (
                                            filteredDocuments.map((doc) => (
                                                <button
                                                    key={doc.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        String(doc.id) ===
                                                        previousDocumentId
                                                    }
                                                    onClick={() =>
                                                        selectPreviousDocument(doc)
                                                    }
                                                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-blue-50 last:border-b-0 ${
                                                        String(doc.id) ===
                                                        previousDocumentId
                                                            ? "bg-blue-50"
                                                            : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold text-slate-800">
                                                            {doc.title}
                                                        </span>

                                                        <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                                            v{doc.version}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 truncate text-xs text-slate-500">
                                                        {doc.filename}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-slate-500">
                                                {replaceableDocuments.length === 0
                                                    ? "No current documents available for replacement."
                                                    : "No matching documents found."}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedPrevious && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
                                    <CheckCircle2 size={15} />

                                    Selected: {selectedPrevious.title}
                                    {" "}— v{selectedPrevious.version}
                                </div>
                            )}

                            <p className="mt-2 text-xs text-slate-500">
                                Type to find a document, then select it
                                from the results. Only current versions
                                can be replaced.
                            </p>
                        </div>

                        {/* Effective Date */}
                        <div>
                            <label
                                htmlFor="knowledge-effective-date"
                                className="label"
                            >
                                New Effective Date
                            </label>

                            <input
                                id="knowledge-effective-date"
                                type="date"
                                className="field bg-white"
                                value={effectiveFrom}
                                onChange={(event) =>
                                    setEffectiveFrom(
                                        event.target.value
                                    )
                                }
                                required
                                disabled={loading}
                            />

                            <p className="mt-1 text-xs text-slate-500">
                                The new version becomes applicable
                                from this date after activation.
                            </p>
                        </div>
                    </div>
                )}

                {/* Visibility */}
                <div>
                    <label
                        htmlFor="knowledge-visibility"
                        className="label"
                    >
                        Document Visibility
                    </label>

                    <select
                        id="knowledge-visibility"
                        className="field bg-white"
                        value={visibility}
                        onChange={(event) =>
                            setVisibility(event.target.value)
                        }
                        disabled={
                            loading ||
                            (uploadType === "version" &&
                                Boolean(selectedPrevious))
                        }
                    >
                        <option value="all_users">
                            All Users — Admin & Staff
                        </option>

                        <option value="admin_only">
                            Admin Only
                        </option>
                    </select>

                    <p className="mt-1 text-xs text-slate-500">
                        {visibility === "all_users"
                            ? "Both Admin and Staff can search this document."
                            : "Only Admin can access and search this document."}
                    </p>

                    {uploadType === "version" &&
                        selectedPrevious && (
                            <p className="mt-1 text-xs text-blue-600">
                                New versions inherit the previous
                                document's visibility.
                            </p>
                        )}
                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertCircle
                            size={17}
                            className="mt-0.5 shrink-0"
                        />

                        <span>{error}</span>
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div
                        role="status"
                        className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                    >
                        <CheckCircle2
                            size={17}
                            className="mt-0.5 shrink-0"
                        />

                        <span>{success}</span>
                    </div>
                )}

                {/* Submit */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {loading ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <UploadCloud size={17} />
                        )}

                        {loading
                            ? "Uploading..."
                            : "Upload Document"}
                    </button>
                </div>
            </form>
        </div>
    );
}
