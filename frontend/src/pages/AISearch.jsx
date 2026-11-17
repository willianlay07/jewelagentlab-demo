import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { useAuth } from "../context/AuthContext";

import { searchProducts } from "../api/searchApi";
import { asList } from "../utils/products";
import { errorText } from "../api/axios";

import ProductCard from "../components/ProductCard";
import { Search } from "lucide-react";

const examples = [
    "Show me rings below $200",
    "Show round diamond rings with 6 prongs",
    "Find elegant minimalist necklaces"
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
                Search approved ORRO jewellery using natural language.
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

                {/* Example Questions */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {examples.map((q) => (
                        <button
                            key={q}
                            type="button"
                            className="btn-light text-xs"
                            onClick={() => run(null, q)}
                        >
                            {q}
                        </button>
                    ))}
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
