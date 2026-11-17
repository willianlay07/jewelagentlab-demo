import { useEffect, useState } from "react";

import {
    Paperclip,
    Download,
    Eye,
    X,
    FileText,
    Image as ImageIcon,
    Loader2,
    Sparkles,
    AlertTriangle
} from "lucide-react";

import { downloadGmailAttachment } from "../api/gmailApi";
import { errorText } from "../api/axios";


function formatFileSize(bytes) {
    if (!bytes) return "0 KB";

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


function isImage(mimeType) {
    return ["image/jpeg", "image/png"].includes(mimeType);
}


export default function EmailAttachments({ attachments = [] }) {
    const [busyId, setBusyId] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        return () => {
            if (preview?.url) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, [preview]);


    if (!attachments.length) {
        return null;
    }


    async function downloadFile(attachment) {
        setBusyId(attachment.id);
        setError("");

        try {
            const blob = await downloadGmailAttachment(
                attachment.id
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = attachment.filename || "attachment";

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);

        } catch (err) {
            setError(errorText(err));

        } finally {
            setBusyId(null);
        }
    }


    async function previewImage(attachment) {
        setBusyId(attachment.id);
        setError("");

        try {
            const blob = await downloadGmailAttachment(
                attachment.id
            );

            if (!isImage(blob.type)) {
                throw new Error("Unsupported image preview");
            }

            const url = URL.createObjectURL(blob);

            setPreview({
                url,
                filename: attachment.filename
            });

        } catch (err) {
            setError(errorText(err));

        } finally {
            setBusyId(null);
        }
    }


    return (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">

            <div className="mb-3 flex items-center gap-2">
                <Paperclip size={17} className="text-slate-600" />

                <h3 className="text-sm font-semibold">
                    Attachments ({attachments.length})
                </h3>
            </div>


            {error && (
                <p
                    role="alert"
                    className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700"
                >
                    {error}
                </p>
            )}


            
            <div className="space-y-3">
                {attachments.map((attachment) => {
                    const image = isImage(attachment.mime_type);
                    const busy = busyId === attachment.id;
                    const analysis = attachment.analysis;

                    return (
                        <div
                            key={attachment.id}
                            className="min-w-0 rounded-lg bg-slate-50 p-3"
                        >
                            {/* File Information */}
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="shrink-0 rounded-lg bg-white p-2">
                                    {image ? (
                                        <ImageIcon size={20} />
                                    ) : (
                                        <FileText size={20} />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="break-all text-sm font-medium">
                                        {attachment.filename}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {attachment.mime_type}
                                        {" · "}
                                        {formatFileSize(attachment.size)}
                                    </p>
                                </div>
                            </div>

                            {/* Attachment Actions */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {attachment.can_download ? (
                                    <>
                                        {image && (
                                            <button
                                                type="button"
                                                onClick={() => previewImage(attachment)}
                                                disabled={busy}
                                                className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs disabled:opacity-50"
                                            >
                                                <Eye size={15} />
                                                Preview
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => downloadFile(attachment)}
                                            disabled={busy}
                                            className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs disabled:opacity-50"
                                        >
                                            {busy ? (
                                                <Loader2
                                                    size={15}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Download size={15} />
                                            )}
                                            Download
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs text-amber-700">
                                        Unsupported or too large
                                    </span>
                                )}
                            </div>

                            {/* Collapsible AI Analysis */}
                            {analysis && (
                                <details className="mt-3 min-w-0 rounded-lg border border-indigo-100 bg-indigo-50/60">
                                    <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs font-semibold text-indigo-800 [&::-webkit-details-marker]:hidden">
                                        <Sparkles size={15} className="shrink-0" />

                                        <span className="flex-1">
                                            AI Attachment Analysis
                                        </span>

                                        <span className="rounded-full bg-white px-2 py-1 text-xs font-normal text-slate-600">
                                            {analysis.status}
                                        </span>

                                        <span className="text-slate-500">
                                            View details
                                        </span>
                                    </summary>

                                    <div className="min-w-0 border-t border-indigo-100 p-3">
                                        {analysis.status === "success" && (
                                            <>
                                                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                                                    {analysis.summary}
                                                </div>

                                                {analysis.model_used && (
                                                    <p className="mt-3 text-xs text-slate-500">
                                                        Model: {analysis.model_used}
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {analysis.status === "failed" && (
                                            <p className="text-xs text-red-700">
                                                Attachment analysis failed.
                                                Please review the original attachment.
                                            </p>
                                        )}

                                        {analysis.requires_review && (
                                            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700">
                                                <AlertTriangle size={14} />
                                                Staff review required
                                            </div>
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    );
                })}
            </div>



            {/* Image Preview */}
            {preview && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Attachment preview"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
                >
                    <div className="relative max-h-full max-w-4xl">

                        <button
                            type="button"
                            onClick={() => setPreview(null)}
                            className="absolute right-2 top-2 rounded-full bg-white p-2"
                            aria-label="Close preview"
                        >
                            <X size={20} />
                        </button>

                        <img
                            src={preview.url}
                            alt={preview.filename}
                            className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        />

                        <p className="mt-2 text-center text-sm text-white">
                            {preview.filename}
                        </p>

                    </div>
                </div>
            )}

        </div>
    );
}