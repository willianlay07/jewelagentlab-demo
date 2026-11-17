
import {
    imageUrl,
    price,
    attributesText
} from "../utils/products";
import { useState } from "react";
import { Gem } from "lucide-react";

const statusColors = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    draft: "bg-amber-100 text-amber-700",
    pending: "bg-blue-100 text-blue-700"
};

export default function ProductCard({ product }) {
    const src = imageUrl(product.images?.[0]);

    const [expanded, setExpanded] = useState(false);

    const description = product.description || "";

    const isLongDescription = description.length > 180;

    return (
        <div className="card min-w-0 overflow-hidden">

            {/* Product Image */}
            <div className="h-56 sm:h-60 bg-white rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                {src ? (
                    <img
                        src={src}
                        alt={product.name || "Jewellery"}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <Gem
                        size={38}
                        className="text-slate-300"
                    />
                )}
            </div>

            {/* Product Name and Status */}
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 break-words font-semibold">
                    {product.name || "Unnamed product"}
                </div>

                <span
                    className={`
                        pill
                        ${statusColors[product.status] || "bg-gray-100 text-gray-700"}
                    `}
                >
                    {product.status || product.category || "Product"}
                </span>
            </div>

            {/* Product Code and Category */}
            <div className="text-xs muted my-1">
                {product.code} · {product.category}
            </div>

            {/* Show both metal prices, including on AI search cards. */}
            <div className="my-2 text-sm space-y-1">
                <div><span className="muted">Silver:</span> <strong>{product.silver_price == null ? "Not available" : price(product.silver_price)}</strong></div>
                <div><span className="muted">Gold:</span> <strong>{product.gold_price == null ? "Not available" : price(product.gold_price)}</strong></div>
            </div>

            {/* Product Description */}
            
            {/* Product Description */}
            <div className="mt-3">
                <p
                    className={`
                        text-sm text-slate-600 break-words leading-relaxed
                        ${expanded ? "" : "line-clamp-4"}
                    `}
                >
                    {product.description}
                </p>

                {isLongDescription && (
                    <button
                        type="button"
                        className="text-sm font-semibold text-[#a18b69] hover:underline mt-2"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? "Show Less" : "Read More"}
                    </button>
                )}
            </div>


            {/* AI Product Attributes */}
            <p className="text-xs muted mt-2 break-words line-clamp-3">
                {attributesText(product.attributes)}
            </p>
        </div>
    );
}
