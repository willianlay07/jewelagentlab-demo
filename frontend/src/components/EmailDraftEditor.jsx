import { useEffect, useState } from "react";
import {
    Sparkles,
    Save,
    CheckCircle,
    XCircle,
    Loader2,
    ExternalLink,
    Send,
    AlertTriangle,
    MailCheck
} from "lucide-react";

import { errorText } from "../api/axios";

import {
    generateEmailDraft,
    updateEmailDraft,
    approveEmailDraft,
    rejectEmailDraft,
    getEmailSendStatus,
    getEmailSendPreview,
    sendApprovedEmail
} from "../api/emailDraftApi";


const STATUS_STYLES = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
};


function DraftPreview({ body }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return (
        <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {body.split(urlRegex).map((part, index) => {
                if (/^https?:\/\//.test(part)) {
                    const url = part.replace(/[.,;!?)]*$/, "");
                    const suffix = part.slice(url.length);

                    return (
                        <span key={index}>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 underline"
                            >
                                {url}
                                <ExternalLink size={12} />
                            </a>
                            {suffix}
                        </span>
                    );
                }

                return <span key={index}>{part}</span>;
            })}

        </div>
    );
}


export default function EmailDraftEditor({
    message,
    initialDraft = null,
    onDraftChange
}) {
    const [draft, setDraft] = useState(initialDraft);
    const [subject, setSubject] = useState(initialDraft?.subject || "");
    const [body, setBody] = useState(initialDraft?.body || "");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [sendStatus, setSendStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [sendPreview, setSendPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        setDraft(initialDraft);
        setSubject(initialDraft?.subject || "");
        setBody(initialDraft?.body || "");
        setError("");
        setNotice("");
        setSendStatus(null);
        setSendPreview(null);
    }, [message.id, initialDraft]);

    useEffect(() => {
        if (!draft?.id || draft.status !== "approved") return;
        let cancelled = false;
        setStatusLoading(true);
        getEmailSendStatus(draft.id)
            .then((result) => {
                if (!cancelled) setSendStatus(result);
            })
            .catch((err) => {
                if (!cancelled) setError(errorText(err));
            })
            .finally(() => {
                if (!cancelled) setStatusLoading(false);
            });
        return () => { cancelled = true; };
    }, [draft?.id, draft?.status]);

    const pending = draft?.status === "pending_review";

    const hasChanges = draft && (
        subject !== draft.subject ||
        body !== draft.body
    );

    async function runAction(action, successMessage) {
        setBusy(true);
        setError("");
        setNotice("");

        try {
            const result = await action();

            setDraft(result);
            setSubject(result.subject);
            setBody(result.body);
            setNotice(successMessage);

            onDraftChange?.(result);

        } catch (err) {
            setError(errorText(err));

        } finally {
            setBusy(false);
        }
    }

    function generate() {
        runAction(
            () => generateEmailDraft(message.id),
            "AI draft generated. Please review it."
        );
    }

    function save() {
        runAction(
            () => updateEmailDraft(draft.id, {
                subject,
                body
            }),
            "Draft saved successfully."
        );
    }

    function approve() {
        if (hasChanges) {
            setError("Save your changes before approving.");
            return;
        }

        if (!window.confirm(
            "Approve this draft? This will NOT send the email."
        )) {
            return;
        }

        runAction(
            () => approveEmailDraft(draft.id),
            "Draft approved. Email has NOT been sent."
        );
    }

    function reject() {
        if (!window.confirm("Reject this email draft?")) {
            return;
        }

        runAction(
            () => rejectEmailDraft(draft.id),
            "Draft rejected."
        );
    }

    async function openSendPreview() {
        if (!draft || busy || sending || statusLoading) return;
        setPreviewLoading(true);
        setError("");
        try {
            const status = await getEmailSendStatus(draft.id);
            setSendStatus(status);
            if (status.status !== "not_reserved" && status.status !== "reserved") {
                setError(`Cannot send: current status is ${status.status}.`);
                return;
            }
            const result = await getEmailSendPreview(draft.id);
            setSendPreview(result);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setPreviewLoading(false);
        }
    }

    async function confirmSend() {
        if (!sendPreview || sending) return;
        const draftId = sendPreview.draft_id;
        setSending(true);
        setError("");
        setNotice("");
        setSendPreview(null);
        try {
            await sendApprovedEmail(draftId);
            setNotice("Email sent successfully.");
        } catch (err) {
            setError(`${errorText(err)} Do not retry until the send status is checked.`);
        } finally {
            try {
                const status = await getEmailSendStatus(draftId);
                setSendStatus(status);
            } catch {
                setSendStatus({ status: "unknown" });
                setError("Unable to verify send status. Do not resend until checked.");
            }
            setSending(false);
        }
    }

    const currentSendState = sendStatus?.status;
    const canOfferSend = draft?.status === "approved" &&
        !statusLoading &&
        ["not_reserved", "reserved"].includes(currentSendState);

    return (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles size={17} className="text-indigo-600" />
                    <h3 className="text-sm font-semibold">
                        AI Email Draft
                    </h3>
                </div>

                {draft && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_STYLES[draft.status] || STATUS_STYLES.pending_review
                    }`}>
                        {draft.status.replaceAll("_", " ")}
                    </span>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </p>
            )}

            {notice && (
                <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {notice}
                </p>
            )}

            {!draft ? (
                <div className="mt-4">
                    <p className="mb-3 text-sm text-slate-500">
                        Generate a draft using the customer's email and
                        AI classification.
                    </p>

                    <button
                        type="button"
                        onClick={generate}
                        disabled={busy || !message.classification}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        {busy
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Sparkles size={16} />
                        }
                        Generate AI Draft
                    </button>

                    {!message.classification && (
                        <p className="mt-2 text-xs text-amber-700">
                            Waiting for email classification.
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-4 space-y-4">

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Subject
                        </label>

                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={!pending || busy}
                            maxLength={500}
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Email Body
                        </label>

                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={!pending || busy}
                            rows={12}
                            maxLength={20000}
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-medium text-slate-600">
                            Email Preview
                        </p>

                        <div className="rounded-lg bg-slate-50 p-4">
                            <DraftPreview body={body} />
                        </div>
                    </div>

                    {draft.product_references?.length > 0 && (
                        <p className="text-xs text-slate-500">
                            Referenced products: {draft.product_references.join(", ")}
                        </p>
                    )}

                    {pending && (
                        <div className="flex flex-wrap gap-2">

                            <button
                                type="button"
                                onClick={save}
                                disabled={busy || !hasChanges || !subject.trim() || !body.trim()}
                                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
                            >
                                <Save size={16} />
                                Save Changes
                            </button>

                            <button
                                type="button"
                                onClick={approve}
                                disabled={busy || hasChanges}
                                className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                            >
                                <CheckCircle size={16} />
                                Approve
                            </button>

                            <button
                                type="button"
                                onClick={reject}
                                disabled={busy}
                                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                            >
                                <XCircle size={16} />
                                Reject
                            </button>

                        </div>
                    )}

                    {draft.status === "approved" && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#202B33]">
                                        {statusLoading ? "Checking sending status..." :
                                         currentSendState === "sent" ? "Email sent" :
                                         currentSendState === "uncertain" ? "Send requires review" :
                                         currentSendState === "sending" ? "Sending in progress" :
                                         currentSendState === "unknown" || !currentSendState ? "Send status unavailable" :
                                         "Approved — ready to send"}
                                    </p>
                                    {currentSendState === "sent" && sendStatus?.sent_at && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Sent at {new Date(sendStatus.sent_at + (sendStatus.sent_at.endsWith("Z") ? "" : "Z")).toLocaleString()}
                                        </p>
                                    )}
                                    {["uncertain", "sending", "unknown"].includes(currentSendState) && (
                                        <p className="mt-1 text-xs text-amber-700">
                                            Do not send again until the Gmail result is verified.
                                        </p>
                                    )}
                                </div>
                                {canOfferSend && (
                                    <button
                                        type="button"
                                        onClick={openSendPreview}
                                        disabled={busy || sending || previewLoading}
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#202B33] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#34434E] disabled:opacity-50"
                                    >
                                        {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        {previewLoading ? "Preparing..." : "Send Email"}
                                    </button>
                                )}
                                {currentSendState === "sent" && <MailCheck size={21} className="text-green-700" />}
                                {currentSendState === "uncertain" && <AlertTriangle size={21} className="text-amber-700" />}
                            </div>
                        </div>
                    )}

                    {draft.status === "rejected" && (
                        <p className="text-sm font-medium text-red-700">
                            This draft was rejected.
                        </p>
                    )}
                </div>
            )}
            {sendPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
                    <div role="dialog" aria-modal="true" aria-labelledby="send-confirm-title" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h3 id="send-confirm-title" className="text-lg font-semibold text-[#202B33]">Confirm email sending</h3>
                            <p className="mt-1 text-xs text-slate-500">Review the recipient and message before sending. This action cannot be undone.</p>
                        </div>
                        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5 text-sm">
                            <p><span className="font-semibold text-slate-600">To:</span> <span className="break-all">{sendPreview.recipient}</span></p>
                            <p><span className="font-semibold text-slate-600">Subject:</span> {sendPreview.subject}</p>
                            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-slate-700">{sendPreview.body}</div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <button type="button" onClick={() => setSendPreview(null)} disabled={sending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                            <button type="button" onClick={confirmSend} disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-[#202B33] px-4 py-2 text-sm font-semibold text-white hover:bg-[#34434E] disabled:opacity-50">
                                <Send size={15} /> Confirm & Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
