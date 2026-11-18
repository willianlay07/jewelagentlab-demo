import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { useAuth } from "../context/AuthContext";

import { searchProducts } from "../api/searchApi";
import { asList } from "../utils/products";
import { errorText } from "../api/axios";

import ProductCard from "../components/ProductCard";
import { Search } from "lucide-react";


const examples = [
    {
        label: "Compare Two Necklaces",
        type: "Strong LLM",
        question:
            "Compare the Amour Heart Pendant and Astrée II Solitaire Pendant. Which would you recommend as an anniversary gift, and why?"
    },
    {
        label: "AI Gift Recommendation",
        type: "Strong LLM",
        question:
            "Recommend the best jewellery gift under S$400 in silver. Compare the available options and explain your choice."
    },
    {
        label: "Compare Necklace vs Ring",
        type: "Strong LLM",
        question:
            "Compare the Amour Heart Pendant and Marguerite Ring. Which would be more suitable for a romantic gift, and why?"
    },
    {
        label: "Gold Budget Recommendation",
        type: "Strong LLM",
        question:
            "Recommend a gold jewellery gift below S$2,000 and explain why it is the best option."
    },
    {
        label: "Semantic Jewellery Search",
        type: "Semantic",
        question:
            "Find elegant minimalist necklaces"
    },
    {
        label: "Structured Price Search",
        type: "Rules",
        question:
            "Show me necklaces below S$300 in silver"
    }
];


export default function AISearch() {
    const { user } = useAuth();

    const isAdmin = user?.role === "admin";

    const [question, setQuestion] = useState("");
    const [limit, setLimit] = useState(5);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function run(e, q = question) {
        e?.preventDefault?.();

        if (!q.trim()) {
            return;
        }

        setQuestion(q);
        setLoading(true);
        setError("");

        try {
            const data = await searchProducts(q, limit);

            setResult(data);
        } catch (e) {
            setError(errorText(e));
        } finally {
            setLoading(false);
        }
    }

    const products = asList(result);

    return (
        <>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                AI Jewellery Search
            </h1>

            <p className="muted mb-6">
                Search approved jewellery using natural language.
            </p>

            {/* Search Form */}
            <form
                onSubmit={run}
                className="card"
            >
                <label className="label">
                    Customer Question
                </label>

                <textarea
                    className="field"
                    rows="3"
                    placeholder="e.g. Do you have round diamond rings below $1000?"
                    value={question}
                    onChange={(e) =>
                        setQuestion(e.target.value)
                    }
                />

                {/* Search Options */}
                <div className="flex flex-wrap gap-3 items-center mt-3">
                    <label className="text-sm">
                        Results
                    </label>

                    <select
                        className="field !w-24"
                        value={limit}
                        onChange={(e) =>
                            setLimit(Number(e.target.value))
                        }
                    >
                        {[3, 5, 10].map((n) => (
                            <option key={n}>
                                {n}
                            </option>
                        ))}
                    </select>

                    <button
                        className="btn flex items-center justify-center gap-2 w-full sm:w-auto"
                        disabled={loading}
                    >
                        <Search size={16} />

                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
                
                {/* Compact Example Questions */}
                <div className="mt-4 border-t border-slate-200 pt-3">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                        Try an AI Search Example
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {examples.map((example) => (
                            <button
                                key={example.label}
                                type="button"
                                disabled={loading}
                                onClick={() => run(null, example.question)}
                                title={example.question}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-[#ad926a] hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                <span className="text-xs font-medium text-slate-800">
                                    {example.label}
                                </span>

                                <span className="shrink-0 rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                                    {example.type}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>


            </form>

            {/* Error Message */}
            {error && (
                <div className="error">
                    {error}
                </div>
            )}

            {/* Search Results */}
            {result && (
                <>
                    {/* AI Response */}
                    <div className="card mt-5 mb-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-500" />

                            <h2 className="font-semibold text-lg">
                                AI Response
                            </h2>
                        </div>

                        {/* Formatted AI Answer */}
                        <div className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">
                            {result.answer ? (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => (
                                            <p className="mb-3 last:mb-0">
                                                {children}
                                            </p>
                                        ),

                                        strong: ({ children }) => (
                                            <strong className="font-semibold text-slate-900">
                                                {children}
                                            </strong>
                                        ),

                                        ul: ({ children }) => (
                                            <ul className="list-disc pl-5 mb-3 space-y-2">
                                                {children}
                                            </ul>
                                        ),

                                        ol: ({ children }) => (
                                            <ol className="list-decimal pl-5 mb-3 space-y-2">
                                                {children}
                                            </ol>
                                        ),

                                        li: ({ children }) => (
                                            <li>{children}</li>
                                        )
                                    }}
                                >
                                    {result.answer}
                                </ReactMarkdown>
                            ) : (
                                <p>
                                    Found {products.length} matching products.
                                </p>
                            )}
                        </div>

                        {/* Admin Only: AI Search Details */}
                        {isAdmin && (
                            <div className="mt-5 pt-4 border-t border-slate-200">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    AI Search Details · Admin Only
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <div className="text-xs text-blue-500 mb-1">
                                            Search Method
                                        </div>

                                        <div className="text-sm font-semibold text-blue-800 capitalize">
                                            {result.search_method || "—"}
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                                        <div className="text-xs text-purple-500 mb-1">
                                            AI Model Used
                                        </div>

                                        <div className="text-sm font-semibold text-purple-800 break-all">
                                            {result.model_used || "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Matching Products */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                        {products.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                            />
                        ))}
                    </div>

                    {/* No Results */}
                    {products.length === 0 && (
                        <p className="muted mt-4">
                            No matching products.
                        </p>
                    )}
                </>
            )}
        </>
    );
}
