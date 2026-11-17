import { useEffect, useState } from "react";
import {
    Image as ImageIcon,
    Loader2,
    AlertTriangle
} from "lucide-react";

import { getGmailRemoteImage } from "../api/gmailApi";

const MAX_IMAGES = 12;

export default function EmailRemoteImages({
    messageId,
    images = []
}) {
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");

    // Release temporary browser image URLs.
    useEffect(() => {
        return () => {
            items.forEach((item) => {
                if (item.url) {
                    URL.revokeObjectURL(item.url);
                }
            });
        };
    }, [items]);

    if (!images.length) return null;

    async function loadImages() {
        if (loading || loaded) return;

        setLoading(true);
        setError("");

        const results = [];

        try {
            for (
                let index = 0;
                index < Math.min(images.length, MAX_IMAGES);
                index++
            ) {
                try {
                    const blob = await getGmailRemoteImage(
                        messageId,
                        index
                    );

                    results.push({
                        index,
                        url: URL.createObjectURL(blob),
                        alt: images[index]?.alt || "Remote image"
                    });

                } catch {
                    results.push({
                        index,
                        url: null,
                        alt: images[index]?.alt || "Remote image"
                    });
                }
            }

            setItems(results);
            setLoaded(true);

        } catch {
            setError("Unable to load remote images.");

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center gap-2">
                <ImageIcon size={17} />

                <h3 className="text-sm font-semibold">
                    Remote Images ({images.length})
                </h3>
            </div>

            {!loaded && (
                <>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Remote images are hidden for privacy.
                        Loading them may notify the sender
                        that this email was viewed.
                    </p>

                    <button
                        type="button"
                        onClick={loadImages}
                        disabled={loading}
                        className="mt-3 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2
                                size={15}
                                className="animate-spin"
                            />
                        ) : (
                            <ImageIcon size={15} />
                        )}

                        {loading
                            ? "Loading images..."
                            : "Load Remote Images"}
                    </button>
                </>
            )}

            {error && (
                <p className="mt-3 text-xs text-red-600">
                    {error}
                </p>
            )}

            {loaded && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    {items.map((item) => (
                        <div
                            key={item.index}
                            className="min-w-0 overflow-hidden rounded-lg border bg-white p-2"
                        >
                            {item.url ? (
                                <img
                                    src={item.url}
                                    alt={item.alt}
                                    loading="lazy"
                                    className="h-auto max-h-80 w-full object-contain"
                                />
                            ) : (
                                <div className="flex min-h-24 items-center justify-center gap-2 text-xs text-slate-500">
                                    <AlertTriangle size={14} />
                                    Image unavailable
                                </div>
                            )}
                        </div>
                    ))}

                </div>
            )}

        </div>
    );
}
