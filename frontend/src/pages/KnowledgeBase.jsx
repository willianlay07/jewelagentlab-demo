import { useState } from "react";
import {
    BookOpen,
    Search,
    FileText,
    UploadCloud,
    ArrowRight,
    CalendarDays,
    GitCompareArrows,
    ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import KnowledgeUpload from "../components/KnowledgeUpload";
import KnowledgeDocumentLibrary from "../components/KnowledgeDocumentLibrary";

import ReactMarkdown from "react-markdown";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";

import { searchKnowledge } from "../api/knowledgeApi";
import { errorText } from "../api/axios";
import KnowledgeSourceViewer from "../components/KnowledgeSourceViewer";

const examples = [
    {
        label: "Current Exchange Policy",
        mode: "current",
        question: "What is the current jewellery exchange period?",
        icon: Search,
    },
    {
        label: "Previous Exchange Policy",
        mode: "historical",
        question: "What was the jewellery exchange period in November 2025?",
        icon: CalendarDays,
    },
    {
        label: "Compare Policy Versions",
        mode: "compare",
        question: "How did the exchange policy change from v1 to v2?",
        icon: GitCompareArrows,
    },
];

export default function KnowledgeBase() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [activeTab, setActiveTab] = useState("ask");
    const [question, setQuestion] = useState("");
    const [mode, setMode] = useState("current");
    const [asOfDate, setAsOfDate] = useState("2025-11-01");
    const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

    const [result, setResult] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    const [selectedSource, setSelectedSource] = useState(null);

    function chooseExample(example) {
        setQuestion(example.question);
        setMode(example.mode);

        if (example.mode === "historical") {
            setAsOfDate("2025-11-01");
        }
    }

    async function handleAskAI(event) {
        event.preventDefault();

        if (!question.trim() || searching) return;

        if (mode === "historical" && !asOfDate) {
            setSearchError("Please select an as-of date.");
            return;
        }

        setSearching(true);
        setSearchError("");
        setResult(null);
        setSelectedSource(null);

        try {
            const data = await searchKnowledge({
                question,
                mode,
                asOfDate,
                limit: 5,
            });

            setResult(data);
        } catch (err) {
            setSearchError(errorText(err));
        } finally {
            setSearching(false);
        }
    }

    const citedNumbers = new Set(
        (result?.citations || [])
            .map((citation) => Number(citation.source_number))
            .filter(Number.isInteger)
    );

    const citedSources = (result?.sources || [])
        .map((source, index) => ({
            ...source,
            sourceNumber: index + 1,
        }))
        .filter((source) => citedNumbers.has(source.sourceNumber));

    function openSource(sourceNumber) {
        const source = result?.sources?.[sourceNumber - 1];

        if (!source || !citedNumbers.has(sourceNumber)) {
            return;
        }

        setSelectedSource({
            ...source,
            sourceNumber,
        });
    }

    const answerWithLinks = (result?.answer || "")
        .replace(
            /\[Source (\d+)\]/g,
            (match, number) => {
                const sourceNumber = Number(number);

                return citedNumbers.has(sourceNumber)
                    ? `[Source ${number}](#knowledge-source-${number})`
                    : match;
            }
        );

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">
                    AI Document Assistant
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Search company documents using AI with verifiable source citations.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab("ask")}
                    className={`flex items-center gap-2 rounded-t-lg border-b-[3px] px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === "ask"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                    }`}
                >
                    <Search size={17} />
                    Ask AI
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("documents")}
                    className={`flex items-center gap-2 rounded-t-lg border-b-[3px] px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === "documents"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                    }`}
                >
                    <FileText size={17} />
                    Documents
                </button>
            </div>

            {/* Ask AI */}
            {activeTab === "ask" && (
                <div className="card border border-slate-200 bg-white shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Search size={20} />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                Ask AI About Documents
                            </h2>

                            <p className="text-sm text-slate-500">
                                Get answers from uploaded company documents.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleAskAI}>
                        <label
                            htmlFor="knowledge-question"
                            className="label"
                        >
                            Your Question
                        </label>

                        <textarea
                            id="knowledge-question"
                            className="field"
                            rows={3}
                            placeholder="e.g. What is the current jewellery exchange period?"
                            value={question}
                            onChange={(event) =>
                                setQuestion(event.target.value)
                            }
                        />

                        <div className="mt-4 flex flex-wrap items-end gap-3">
                            <div className="min-w-[190px] flex-1 sm:flex-none">
                                <label
                                    htmlFor="knowledge-mode"
                                    className="label"
                                >
                                    Search Mode
                                </label>

                                <select
                                    id="knowledge-mode"
                                    className="field"
                                    value={mode}
                                    onChange={(event) =>
                                        setMode(event.target.value)
                                    }
                                >
                                    <option value="current">
                                        Current Policy
                                    </option>
                                    <option value="historical">
                                        Historical Search
                                    </option>
                                    <option value="compare">
                                        Compare Versions
                                    </option>
                                </select>
                            </div>

                            {mode === "historical" && (
                                <div className="min-w-[180px] flex-1 sm:flex-none">
                                    <label
                                        htmlFor="knowledge-date"
                                        className="label"
                                    >
                                        As-of Date
                                    </label>

                                    <input
                                        id="knowledge-date"
                                        type="date"
                                        className="field"
                                        value={asOfDate}
                                        onChange={(event) =>
                                            setAsOfDate(event.target.value)
                                        }
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!question.trim() || searching}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                {searching ? (
                                    <>
                                        <Loader2 size={17} className="animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <Search size={17} />
                                        Ask AI
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Example Questions */}
                    <div className="mt-6 border-t border-slate-200 pt-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Try an Example
                        </p>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {examples.map((example) => {
                                const Icon = example.icon;

                                return (
                                    <button
                                        key={example.label}
                                        type="button"
                                        onClick={() =>
                                            chooseExample(example)
                                        }
                                        className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-3 text-left text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                                    >
                                        <Icon
                                            size={16}
                                            className="shrink-0"
                                        />

                                        {example.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    
                    {/* Search Error */}
                    {searchError && (
                        <div
                            role="alert"
                            className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            <AlertCircle size={18} className="shrink-0" />
                            {searchError}
                        </div>
                    )}

                    {/* AI Answer */}
                    {result && (
                        <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
                            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />

                                    <h3 className="text-base font-bold text-slate-800">
                                        AI Answer
                                    </h3>
                                </div>

                                <div className="prose prose-sm max-w-none break-words text-slate-700">
                                    <ReactMarkdown
                                        components={{
                                            a: ({ href, children }) => {
                                                const match = href?.match(
                                                    /^#knowledge-source-(\d+)$/
                                                );

                                                if (match) {
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openSource(Number(match[1]))
                                                            }
                                                            className="inline font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                                                        >
                                                            {children}
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {children}
                                                    </a>
                                                );
                                            },
                                        }}
                                    >
                                        {answerWithLinks || "No answer available."}
                                    </ReactMarkdown>
                                </div>

                                {result.citation_verified && (
                                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-green-700">
                                        <ShieldCheck size={15} />
                                        Citation references validated
                                    </p>
                                )}
                            </div>

                            {/* Source References */}
                            {citedSources.length > 0 && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5">
                                    <h3 className="mb-3 text-sm font-bold text-slate-800">
                                        Cited Document Sources ({citedSources.length})
                                    </h3>

                                    <div className="space-y-3">
                                        {citedSources.map((source) => (
                                            <div
                                                key={`${source.document_id}-${source.chunk_id}`}
                                                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2">
                                                        <FileText
                                                            size={18}
                                                            className="mt-0.5 text-blue-600"
                                                        />

                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openSource(source.sourceNumber)}
                                                                    className="text-left text-blue-700 hover:underline"
                                                                >
                                                                    [Source {source.sourceNumber}]{" "}
                                                                    {source.document_title}
                                                                </button>
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Version {source.version}
                                                                {" · "}
                                                                Page {source.page_number ?? "N/A"}
                                                                {" · "}
                                                                {source.status}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">
                                                    {source.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Admin Only: Technical Details */}
                            {isAdmin && (
                                <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="rounded-lg bg-indigo-50 px-3 py-2">
                                        <p className="text-xs text-indigo-500">
                                            Intent Routing
                                        </p>
                                        <p className="text-sm font-semibold capitalize text-indigo-800">
                                            {result.intent?.replaceAll("_", " ") || "—"}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-blue-50 px-3 py-2">
                                        <p className="text-xs text-blue-500">
                                            Search Method
                                        </p>
                                        <p className="text-sm font-semibold capitalize text-blue-800">
                                            {result.search_method || "Not required"}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-purple-50 px-3 py-2">
                                        <p className="text-xs text-purple-500">
                                            AI Model Used
                                        </p>
                                        <p className="text-sm font-semibold text-purple-800">
                                            {result.model_used || "—"}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <p className="text-xs text-slate-500">
                                            Search Mode
                                        </p>
                                        <p className="text-sm font-semibold capitalize text-slate-800">
                                            {result.mode || "—"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* Documents */}
            {activeTab === "documents" && (
                <div className="card border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <FileText size={20} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Knowledge Documents
                                </h2>

                                <p className="text-sm text-slate-500">
                                    {isAdmin
                                        ? "Upload and manage company documents."
                                        : "Browse documents shared with you."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Document Upload */}
                    {isAdmin && (
                        <KnowledgeUpload
                            onUploaded={() =>
                                setLibraryRefreshKey((key) => key + 1)
                            }
                        />
                    )}

                    {/* Document Library Placeholder */}
                    <KnowledgeDocumentLibrary refreshKey={libraryRefreshKey} />

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck
                            size={15}
                            className="text-blue-600"
                        />

                        Document access is controlled by Admin
                        and Staff permissions.
                    </div>
                </div>
            )}

            {selectedSource && (
                <KnowledgeSourceViewer
                    source={selectedSource}
                    sourceNumber={selectedSource.sourceNumber}
                    onClose={() => setSelectedSource(null)}
                />
            )}

        </div>
    );
}
