
import { useEffect, useMemo, useState } from "react";
import {
    Search,
    FileText,
    Eye,
    Download,
    RefreshCw,
    Loader2,
    X,
    Shield,
    Users,
    AlertCircle,
} from "lucide-react";

import {
    getKnowledgeDocuments,
    previewKnowledgeDocument,
    downloadKnowledgeDocument,
} from "../api/knowledgeApi";

import { errorText } from "../api/axios";
import { useAuth } from "../context/AuthContext";

const statusStyles = {
    current: "bg-green-50 text-green-700 border-green-200",
    superseded: "bg-slate-100 text-slate-600 border-slate-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
};

export default function KnowledgeDocumentLibrary({ refreshKey = 0 }) {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [documents, setDocuments] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionId, setActionId] = useState(null);
    const [preview, setPreview] = useState(null);

    async function loadDocuments() {
        setLoading(true);
        setError("");

        try {
            const data = await getKnowledgeDocuments();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDocuments();
    }, [refreshKey]);

    useEffect(() => {
        return () => {
            if (preview?.url) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, [preview]);

    const filteredDocuments = useMemo(() => {
        const search = query.trim().toLowerCase();

        return documents.filter((doc) => {
            if (!search) return true;

            return [
                doc.title,
                doc.filename,
                doc.file_type,
                `v${doc.version}`,
                String(doc.id),
            ].some((value) =>
                String(value || "").toLowerCase().includes(search)
            );
        });
    }, [documents, query]);

    async function handlePreview(doc) {
        setError("");
        setActionId(doc.id);

        try {
            const blob = await previewKnowledgeDocument(doc.id);

            const url = URL.createObjectURL(blob);

            setPreview({
                url,
                filename: doc.filename,
                fileType: doc.file_type,
                title: doc.title,
                version: doc.version,
            });
        } catch (err) {
            setError(errorText(err));
        } finally {
            setActionId(null);
        }
    }

    async function handleDownload(doc) {
        setError("");
        setActionId(doc.id);

        try {
            const blob = await downloadKnowledgeDocument(doc.id);
            const url = URL.createObjectURL(blob);

            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = doc.filename || "document";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setActionId(null);
        }
    }

    return (
        <>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">
                            Document Library
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            {filteredDocuments.length} of {documents.length} documents
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadDocuments}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={14}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>

                {/* Search */}
                <div className="border-b border-slate-100 p-4">
                    <div className="relative">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            className="field w-full bg-white !pl-10"
                            placeholder="Search by title, filename or version..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertCircle size={17} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
                        <Loader2 size={19} className="animate-spin" />
                        Loading documents...
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center p-10 text-center">
                        <FileText size={30} className="mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                            No documents found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {query
                                ? "Try a different search."
                                : "Uploaded documents will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex flex-col gap-3 p-4 hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <FileText size={21} />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold text-slate-800">
                                            {doc.title}
                                        </p>

                                        <p className="mt-1 break-all text-xs text-slate-500">
                                            {doc.filename}
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                                v{doc.version}
                                            </span>

                                            <span
                                                className={`rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                                                    statusStyles[doc.status] ||
                                                    "border-slate-200 bg-slate-50 text-slate-600"
                                                }`}
                                            >
                                                {doc.status}
                                            </span>

                                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                {doc.visibility === "admin_only" ? (
                                                    <Shield size={13} />
                                                ) : (
                                                    <Users size={13} />
                                                )}

                                                {doc.visibility === "admin_only"
                                                    ? "Admin Only"
                                                    : "All Users"}
                                            </span>

                                            {doc.effective_from && (
                                                <span className="text-xs text-slate-500">
                                                    Effective: {doc.effective_from}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 gap-2 pl-14 lg:pl-0">
                                    <button
                                        type="button"
                                        onClick={() => handlePreview(doc)}
                                        disabled={actionId !== null}
                                        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        {actionId === doc.id ? (
                                            <Loader2 size={15} className="animate-spin" />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                        Preview
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDownload(doc)}
                                        disabled={actionId !== null}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                        <Download size={15} />
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Secure Preview Modal */}
            {preview && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-3 sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Preview ${preview.title}`}
                >
                    <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold text-slate-800">
                                    {preview.title}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Version {preview.version} · {preview.filename}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreview(null)}
                                aria-label="Close preview"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 bg-slate-100">
                            {["pdf", "txt", "md"].includes(
                                preview.fileType?.toLowerCase()
                            ) ? (
                                <iframe
                                    title="Document preview"
                                    src={preview.url}
                                    className="h-full w-full border-0"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                                    <FileText size={36} className="text-blue-500" />
                                    <p className="text-sm text-slate-600">
                                        Browser preview is not available for this file type.
                                        Use Download to open the original document.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
