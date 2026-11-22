import { useEffect, useState } from "react";
import {
    X,
    FileText,
    Eye,
    Download,
    Loader2,
    AlertCircle,
} from "lucide-react";

import {
    getKnowledgeSource,
    previewKnowledgeDocument,
    downloadKnowledgeDocument,
} from "../api/knowledgeApi";

import { errorText } from "../api/axios";

export default function KnowledgeSourceViewer({
    source,
    sourceNumber,
    onClose,
}) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewType, setPreviewType] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadSource() {
            setLoading(true);
            setError("");

            try {
                const data = await getKnowledgeSource(
                    source.chunk_id
                );

                if (!cancelled) {
                    setDetails(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(errorText(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSource();

        return () => {
            cancelled = true;
        };
    }, [source.chunk_id]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [onClose]);

    async function handlePreview() {
        if (!details) return;

        setBusy("preview");
        setError("");

        try {
            const blob = await previewKnowledgeDocument(
                details.document_id
            );

            const url = URL.createObjectURL(blob);

            setPreviewType(
                details.filename?.split(".").pop()?.toLowerCase()
            );
            setPreviewUrl(url);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy("");
        }
    }

    async function handleDownload() {
        if (!details) return;

        setBusy("download");
        setError("");

        try {
            const blob = await downloadKnowledgeDocument(
                details.document_id
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = details.filename || "document";

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy("");
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Source ${sourceNumber}`}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-3 sm:p-6"
        >
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <FileText size={21} />
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-slate-800">
                                Source {sourceNumber}
                            </h2>

                            <p className="truncate text-xs text-slate-500">
                                {details?.document_title ||
                                    source.document_title}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close source viewer"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                            Loading source...
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertCircle size={17} />
                            {error}
                        </div>
                    )}

                    {details && (
                        <>
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <h3 className="font-semibold text-slate-800">
                                    {details.document_title}
                                </h3>

                                <p className="mt-1 break-all text-xs text-slate-500">
                                    {details.filename}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                                        Version {details.version}
                                    </span>

                                    <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                                        Page {details.page_number ?? "N/A"}
                                    </span>

                                    <span className="rounded-md bg-white px-2 py-1 text-xs capitalize text-slate-600">
                                        {details.status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-bold text-slate-800">
                                    Source Excerpt
                                </h3>

                                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                    {details.content}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={Boolean(busy)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Eye size={16} />
                                    Preview Original
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={Boolean(busy)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    Download
                                </button>
                            </div>

                            {previewUrl && (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                                        Original Document
                                    </div>

                                    {["pdf", "txt", "md"].includes(
                                        previewType
                                    ) ? (
                                        <iframe
                                            title="Original document preview"
                                            src={
                                                previewType === "pdf" &&
                                                details.page_number
                                                    ? `${previewUrl}#page=${details.page_number}`
                                                    : previewUrl
                                            }
                                            className="h-[55vh] w-full border-0"
                                        />
                                    ) : (
                                        <p className="p-5 text-sm text-slate-600">
                                            Browser preview is not available
                                            for this file type. Please download
                                            the original document.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}