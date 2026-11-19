import { useCallback, useEffect, useState } from "react";

import {
    Mail,
    RefreshCw,
    Inbox,
    Sparkles,
    AlertTriangle,
    MailOpen,
    ArrowLeft,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { errorText } from "../api/axios";

import {
    getGmailThreads,
    getGmailThread,
    syncGmailInbox,
    updateGmailThreadRead
} from "../api/gmailApi";

import EmailDraftEditor from "../components/EmailDraftEditor";
import { getEmailDrafts } from "../api/emailDraftApi";
import EmailAttachments from "../components/EmailAttachments";
import EmailHtmlPreview from "../components/EmailHtmlPreview";

const CATEGORY_LABELS = {
    product_enquiry: "Product Enquiry",
    order_enquiry: "Order Enquiry",
    customer_support: "Customer Support",
    general: "General"
};

const CATEGORY_COLORS = {
    product_enquiry: "bg-blue-100 text-blue-700",
    order_enquiry: "bg-purple-100 text-purple-700",
    customer_support: "bg-orange-100 text-orange-700",
    general: "bg-slate-100 text-slate-700"
};

function displayDate(value) {
    if (!value) return "";

    const date = new Date(
        /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
            ? value
            : `${value}Z`
    );

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString();
}

function formatPrice(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? `S$${number.toLocaleString("en-SG")}`
        : null;
}

function ClassificationPanel({ classification }) {
    if (!classification) {
        return (
            <div className="mt-4 rounded-lg bg-[#F7F8FA] p-3">
                <p className="text-xs text-slate-500">
                    AI classification pending
                </p>
            </div>
        );
    }

    const data = classification.extracted_data || {};

    const categoryLabel =
        CATEGORY_LABELS[classification.category] ||
        classification.category;

    const categoryColor =
        CATEGORY_COLORS[classification.category] ||
        CATEGORY_COLORS.general;

    const confidence = Number.isFinite(
        Number(classification.confidence)
    )
        ? Math.round(
            Number(classification.confidence) * 100
        )
        : null;

    return (
        <div className="mt-4 rounded-xl border border-[#E1E7F0] bg-[#F5F8FD] p-4 shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles
                        size={17}
                        className="text-[#B89966]"
                    />

                    <h3 className="text-sm font-semibold">
                        AI Classification
                    </h3>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColor}`}
                >
                    {categoryLabel}
                </span>
            </div>

            <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">
                    AI Summary
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {classification.summary}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">

                {data.product_category && (
                    <span className="rounded-md bg-white px-3 py-1 text-xs text-slate-700">
                        Product: {data.product_category}
                    </span>
                )}

                {data.metal && (
                    <span className="rounded-md bg-white px-3 py-1 text-xs text-slate-700">
                        Metal: {data.metal}
                    </span>
                )}

                {data.max_price !== null &&
                    data.max_price !== undefined && (
                        <span className="rounded-md bg-white px-3 py-1 text-xs text-slate-700">
                            Max Price: {formatPrice(data.max_price)}
                        </span>
                    )}

                {data.order_number && (
                    <span className="rounded-md bg-white px-3 py-1 text-xs text-slate-700">
                        Order: {data.order_number}
                    </span>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E7F0] pt-3">

                <span className="text-xs text-slate-500">
                    AI Confidence: {
                        confidence === null
                            ? "N/A"
                            : `${confidence}%`
                    }
                </span>

                <span className="text-xs text-slate-500">
                    Model: {classification.model_used || "N/A"}
                </span>
            </div>

            {classification.requires_review && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100 p-3 text-xs font-medium text-amber-800">
                    <AlertTriangle size={16} />
                    Staff Review Required
                </div>
            )}
        </div>
    );
}

export default function GmailInbox() {
    const { user } = useAuth();

    const [threads, setThreads] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedIsRead, setSelectedIsRead] = useState(false);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [openingId, setOpeningId] = useState(null);
    const [readBusy, setReadBusy] = useState(false);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [drafts, setDrafts] = useState({});
    const [draftsLoading, setDraftsLoading] = useState(true);

    // ---------------------------------------
    // Load Email Drafts
    // ---------------------------------------

    const loadDrafts = useCallback(async () => {
        try {
            const data = await getEmailDrafts();

            const draftMap = {};

            for (const draft of data) {
                draftMap[draft.email_message_id] = draft;
            }

            setDrafts(draftMap);

        } catch (err) {
            setError(errorText(err));

        } finally {
            setDraftsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    function handleDraftChange(updatedDraft) {
        setDrafts((previous) => ({
            ...previous,
            [updatedDraft.email_message_id]: updatedDraft
        }));
    }

    // ---------------------------------------
    // Load Gmail Threads
    // ---------------------------------------

    const loadThreads = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const data = await getGmailThreads(targetPage, pageSize);
            setThreads(data.items || []);
            setTotal(data.total ?? 0);
            setTotalPages(data.total_pages ?? 1);
            setUnreadCount(data.unread_count ?? 0);

            // Handle the last page disappearing after a data change.
            if (targetPage > (data.total_pages ?? 1)) {
                setPage(data.total_pages || 1);
            }
        } catch (err) {
            setError(errorText(err));
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        loadThreads(page);
    }, [page, loadThreads]);

    // ---------------------------------------
    // Open Thread and Mark as Read
    // ---------------------------------------

    async function openThread(id) {
        if (openingId !== null) return;

        setOpeningId(id);
        setError("");

        try {
            const data = await getGmailThread(id);

            setSelected(data);
            setMobileDetailOpen(true);
            window.scrollTo({ top: 0, behavior: "instant" });

            // Mark as read in MySQL.
            await updateGmailThreadRead(id, true);
            setSelectedIsRead(true);
            const wasUnread = threads.some(
                (thread) => thread.id === id && !thread.is_read
            );
            if (wasUnread) {
                setUnreadCount((count) => Math.max(0, count - 1));
            }

            setThreads((previous) =>
                previous.map((thread) =>
                    thread.id === id
                        ? { ...thread, is_read: true }
                        : thread
                )
            );

        } catch (err) {
            setError(errorText(err));

        } finally {
            setOpeningId(null);
        }
    }

    function backToInbox() {
        setMobileDetailOpen(false);
        window.scrollTo({ top: 0, behavior: "instant" });
    }

    // ---------------------------------------
    // Mark Selected Thread as Unread
    // ---------------------------------------

    async function markUnread(id) {
        if (readBusy) return;

        setReadBusy(true);
        setError("");

        try {
            await updateGmailThreadRead(id, false);
            if (selectedIsRead) {
                setUnreadCount((count) => count + 1);
            }
            setSelectedIsRead(false);

            setThreads((previous) =>
                previous.map((thread) =>
                    thread.id === id
                        ? { ...thread, is_read: false }
                        : thread
                )
            );

        } catch (err) {
            setError(errorText(err));

        } finally {
            setReadBusy(false);
        }
    }

    // ---------------------------------------
    // Sync Gmail Inbox
    // ---------------------------------------

    async function synchronize() {
        setBusy(true);
        setNotice("");
        setError("");

        try {
            const result = await syncGmailInbox();

            setNotice(
                `Scanned ${result.scanned} messages; imported ${result.imported}.`
            );

            // Refresh the current page and global counts after sync.
            await loadThreads(page);

            if (selected) {
                const updated = await getGmailThread(
                    selected.id
                );

                setSelected(updated);
            }

        } catch (err) {
            setError(errorText(err));

        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-5 text-[#202B33]">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#202B33]">
                        Gmail Inbox
                    </h1>

                    <p className="text-sm text-slate-500">
                        Shared customer email conversations
                    </p>
                </div>

                {user?.role === "admin" && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={synchronize}
                        className="flex items-center gap-2 rounded-xl bg-[#202B33] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#34444F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C3A36C] disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={busy ? "animate-spin" : ""}
                        />

                        {busy ? "Syncing..." : "Sync Gmail"}
                    </button>
                )}
            </div>

            
            {/* AI Email Agent Demo Guide */}
            <div className="rounded-xl border border-[#E3E8EE] bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-[#202B33]">
                            Try the AI Email Agent
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Send a test jewellery enquiry to experience AI classification,
                            product recommendations and draft generation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">
                            Demo inbox:
                        </span>

                        <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                            wilyanhein2013@gmail.com
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                navigator.clipboard.writeText("wilyanhein2013@gmail.com")
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <span>1. Send a jewellery enquiry</span>
                    <span>2. Sync Gmail</span>
                    <span>3. Open the conversation</span>
                    <span>4. Review the AI draft</span>
                </div>
            </div>


            {/* Alerts */}
            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            {notice && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {notice}
                </p>
            )}

            <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">

                {/* Conversations */}
                <section className={`${mobileDetailOpen ? "hidden lg:block" : "block"} min-w-0 overflow-hidden rounded-2xl border border-[#E3E8EE] bg-white shadow-[0_6px_24px_rgba(32,43,51,0.045)]`}>

                    <div className="flex items-center gap-2 border-b border-[#E8ECF0] bg-[#FBFCFD] p-4 font-semibold text-[#202B33]">
                        <Inbox size={18} />

                        <span>Conversations</span>

                        {unreadCount > 0 && (
                            <span className="ml-auto rounded-full bg-[#EAF1FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <p className="p-4 text-sm text-slate-500">
                            Loading...
                        </p>

                    ) : total === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                            No emails imported yet.
                        </p>

                    ) : (
                        <div className="max-h-[620px] divide-y divide-[#EDF0F3] overflow-y-auto">

                            {threads.map((thread) => {
                                const unread = !thread.is_read;
                                const active = selected?.id === thread.id;

                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        disabled={openingId !== null}
                                        onClick={() => openThread(thread.id)}
                                        className={`block w-full border-l-[3px] px-4 py-4 text-left transition-colors hover:bg-[#F7F8FA] disabled:cursor-wait ${
                                            active
                                                ? "border-l-[#C3A36C] bg-[#FAF7F1]"
                                                : unread
                                                    ? "border-l-transparent bg-[#F8FAFE]"
                                                    : "border-l-transparent bg-white"
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">

                                            {/* Unread Blue Dot */}
                                            {unread ? (
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563EB]" />
                                            ) : (
                                                <span className="h-2.5 w-2.5 shrink-0" />
                                            )}

                                            <span
                                                className={`min-w-0 flex-1 truncate text-sm ${
                                                    unread
                                                        ? "font-semibold text-[#202B33]"
                                                        : "font-normal text-[#566575]"
                                                }`}
                                            >
                                                {thread.subject || "(No subject)"}
                                            </span>

                                            {openingId === thread.id && (
                                                <RefreshCw
                                                    size={14}
                                                    className="shrink-0 animate-spin text-slate-400"
                                                />
                                            )}
                                        </div>

                                        <div className="mt-1 pl-[18px] text-xs text-slate-500">
                                            {displayDate(thread.last_message_at)}
                                        </div>
                                    </button>
                                );
                            })}

                        </div>
                    )}

                    {/* Server-side pagination */}
                    {total > 0 && (
                        <div className="border-t border-[#E8ECF0] bg-[#FBFCFD] p-3">
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    disabled={loading || page <= 1}
                                    onClick={() => setPage((current) => current - 1)}
                                    className="flex items-center gap-1 rounded-lg border border-[#DFE5EB] bg-white px-3 py-2 text-xs font-medium text-[#34444F] transition-colors hover:border-[#C3A36C] hover:bg-[#FAF7F1] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft size={15} /> Previous
                                </button>
                                <span className="text-xs font-medium text-slate-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={loading || page >= totalPages}
                                    onClick={() => setPage((current) => current + 1)}
                                    className="flex items-center gap-1 rounded-lg border border-[#DFE5EB] bg-white px-3 py-2 text-xs font-medium text-[#34444F] transition-colors hover:border-[#C3A36C] hover:bg-[#FAF7F1] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next <ChevronRight size={15} />
                                </button>
                            </div>
                            <p className="mt-2 text-center text-xs text-slate-500">
                                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} conversations
                            </p>
                        </div>
                    )}
                </section>

                {/* Email Details */}
                <section className={`${mobileDetailOpen ? "block" : "hidden lg:block"} min-w-0 overflow-hidden rounded-2xl border border-[#E3E8EE] bg-white shadow-[0_6px_24px_rgba(32,43,51,0.045)]`}>

                    {!selected ? (
                        <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-6 text-slate-500">
                            <Mail size={32} />

                            <p>
                                Select a conversation to read its messages.
                            </p>
                        </div>

                    ) : (
                        <>
                            {/* Mobile back navigation */}
                            <div className="border-b border-[#E8ECF0] p-3 lg:hidden">
                                <button
                                    type="button"
                                    onClick={backToInbox}
                                    className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                    <ArrowLeft size={18} />
                                    Back to Inbox
                                </button>
                            </div>

                            {/* Selected Thread Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF0] bg-[#FBFCFD] p-4">

                                <h2 className="min-w-0 break-words text-lg font-semibold">
                                    {selected.subject || "(No subject)"}
                                </h2>

                                
                                {selectedIsRead && (
                                    <button
                                        type="button"
                                        onClick={() => markUnread(selected.id)}
                                        disabled={readBusy || openingId !== null}
                                        className="flex shrink-0 items-center gap-2 rounded-lg border border-[#D9DFE5] bg-white px-3 py-2 text-xs font-medium text-[#34444F] transition-colors hover:border-[#C3A36C] hover:bg-[#FAF7F1] disabled:opacity-50"
                                    >
                                        <MailOpen size={15} />
                                        {readBusy ? "Updating..." : "Mark as Unread"}
                                    </button>
                                )}

                            </div>

                            <div className="max-h-[650px] space-y-4 overflow-y-auto bg-[#F9FAFC] p-4 sm:p-5 lg:p-6">

                                {selected.messages.map((msg) => (
                                    <article
                                        key={msg.id}
                                        className="min-w-0 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm sm:p-5 lg:p-6"
                                    >

                                        {/* Email Information */}
                                        <div className="break-words text-sm font-semibold text-[#202B33]">
                                            {msg.sender}
                                        </div>

                                        <div className="break-words text-xs text-slate-500">
                                            To: {msg.recipient}
                                        </div>

                                        <div className="mb-3 text-xs text-slate-500">
                                            {displayDate(msg.sent_at)}
                                        </div>

                                        {/* HTML Email Preview */}
                                        <EmailHtmlPreview
                                            messageId={msg.id}
                                            fallbackText={msg.body_text}
                                            images={msg.remote_images || []}
                                        />

                                        {/* Gmail Attachments */}
                                        <EmailAttachments
                                            attachments={msg.attachments || []}
                                        />

                                        

                                        {/* AI Classification */}
                                        <ClassificationPanel
                                            classification={msg.classification}
                                        />

                                        {/* AI Email Draft */}
                                        {draftsLoading ? (
                                            <p className="mt-3 text-sm text-slate-500">
                                                Loading email drafts...
                                            </p>
                                        ) : (
                                            <EmailDraftEditor
                                                message={msg}
                                                initialDraft={drafts[msg.id] || null}
                                                onDraftChange={handleDraftChange}
                                            />
                                        )}

                                    </article>
                                ))}

                            </div>
                        </>
                    )}
                </section>

            </div>
        </div>
    );
}