
import { useEffect, useRef, useState } from "react";

import {
    Image as ImageIcon,
    Loader2
} from "lucide-react";

import {
    getGmailHtmlPreview,
    getGmailRemoteImage
} from "../api/gmailApi";


const MAX_IMAGES = 30;

const FRAME_CSP = [
    "default-src 'none'",
    "img-src data:",
    "media-src 'none'",
    "font-src 'none'",
    "connect-src 'none'",
    "script-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "style-src 'unsafe-inline'"
].join("; ");


function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(
            new Error("Unable to read image")
        );

        reader.readAsDataURL(blob);
    });
}


function buildEmailDocument(html, imageData) {
    // Parse the already-sanitized backend HTML.
    const doc = new DOMParser().parseFromString(
        html,
        "text/html"
    );

    const images = doc.querySelectorAll(
        "img[data-remote-index]"
    );

    images.forEach((img) => {
        const index = Number(
            img.getAttribute("data-remote-index")
        );

        const dataUrl = imageData[index];

        // Never insert the original remote URL.
        if (
            typeof dataUrl === "string" &&
            /^data:image\/(jpeg|png|gif|webp);base64,/i.test(dataUrl)
        ) {
            img.setAttribute("src", dataUrl);
        } else {
            img.removeAttribute("src");

            const placeholder = doc.createElement("div");
            placeholder.className = "remote-image-placeholder";

            const width = parseInt(img.getAttribute("width"), 10);
            const height = parseInt(img.getAttribute("height"), 10);

            if (Number.isFinite(width) && width > 0) {
                placeholder.style.maxWidth =
                    `${Math.min(width, 1200)}px`;
            }

            if (Number.isFinite(height) && height > 0) {
                placeholder.style.height =
                    `${Math.min(Math.max(height, 60), 400)}px`;
            } else {
                placeholder.style.height = "140px";
            }

            placeholder.textContent = "▧  Image hidden";

            img.replaceWith(placeholder);
        }
    });

    const safeBody = doc.body.innerHTML;

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">

            <meta
                http-equiv="Content-Security-Policy"
                content="${FRAME_CSP}"
            >

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
            >

            <style>
                html, body {
                    margin: 0;
                    overflow-wrap: anywhere;
                }

                body {
                    box-sizing: border-box;
                    padding: 16px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                }

                table {
                    max-width: 100%;
                }

                img {
                    max-width: 100%;
                    height: auto;
                }

                .remote-image-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    width: 100%;
                    min-height: 60px;
                    margin: 0 auto;
                    background: #f1f5f9;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    color: #64748b;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                }
            </style>
        </head>

        <body>${safeBody}</body>
        </html>
    `;
}


export default function EmailHtmlPreview({
    messageId,
    fallbackText = "",
    images = []
}) {
    const [html, setHtml] = useState("");
    const [hasHtml, setHasHtml] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    const [imageData, setImageData] = useState({});
    const [error, setError] = useState("");

    const requestVersion = useRef(0);

    useEffect(() => {
        const version = ++requestVersion.current;
        let cancelled = false;

        setHtml("");
        setHasHtml(false);
        setLoading(true);
        setLoadingImages(false);
        setImagesLoaded(false);
        setImageData({});
        setError("");

        async function loadPreview() {
            try {
                const result = await getGmailHtmlPreview(
                    messageId
                );

                if (cancelled) return;

                setHtml(result.html || "");
                setHasHtml(Boolean(result.has_html));

            } catch {
                if (!cancelled) {
                    setError("HTML preview unavailable.");
                }

            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadPreview();

        return () => {
            cancelled = true;
            if (requestVersion.current === version) {
                requestVersion.current++;
            }
        };
    }, [messageId]);


    async function loadRemoteImages() {
        if (loadingImages || imagesLoaded) return;

        const version = requestVersion.current;

        setLoadingImages(true);
        setError("");

        const loaded = {};

        try {
            const limit = Math.min(
                images.length,
                MAX_IMAGES
            );

            for (let index = 0; index < limit; index++) {
                if (version !== requestVersion.current) {
                    return;
                }

                try {
                    const blob = await getGmailRemoteImage(
                        messageId,
                        index
                    );

                    if (
                        ![
                            "image/jpeg",
                            "image/png",
                            "image/gif",
                            "image/webp"
                        ].includes(blob.type)
                    ) {
                        continue;
                    }

                    loaded[index] = await blobToDataUrl(
                        blob
                    );

                } catch (err) {
                    console.warn(
                        "Remote image unavailable:",
                        index,
                        err
                    );
                }
            }

            if (version !== requestVersion.current) {
                return;
            }

            setImageData(loaded);
            setImagesLoaded(true);

        } catch {
            if (version === requestVersion.current) {
                setError("Unable to load remote images.");
            }

        } finally {
            if (version === requestVersion.current) {
                setLoadingImages(false);
            }
        }
    }


    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading email preview...
            </p>
        );
    }

    
    if (!hasHtml || !html) {
        return (
            <div className="min-w-0 rounded-xl border border-[#E5E9EE] bg-[#FAFBFC] px-4 py-4 sm:px-5 sm:py-5">
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-[#34444F]">
                    {fallbackText || "(No email body available)"}
                </div>
            </div>
        );
    }


    const srcDoc = buildEmailDocument(
        html,
        imageData
    );

    return (
        <div className="min-w-0">

            {/* Remote Image Controls */}
            {images.length > 0 && (
                <div className="mb-3 rounded-xl border border-[#E5E9EE] bg-[#F7F8FA] p-3 sm:p-4">

                    <div className="flex flex-wrap items-center justify-between gap-3">

                        <div className="flex items-center gap-2">
                            <ImageIcon size={17} className="text-[#B89966]" />

                            <span className="text-xs font-semibold text-[#34444F]">
                                Remote Images ({images.length})
                            </span>
                        </div>

                        {!imagesLoaded && (
                            <button
                                type="button"
                                onClick={loadRemoteImages}
                                disabled={loadingImages}
                                className="flex items-center gap-2 rounded-lg bg-[#202B33] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#34444F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C3A36C] disabled:opacity-50"
                            >
                                {loadingImages ? (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <ImageIcon size={15} />
                                )}

                                {loadingImages
                                    ? "Loading..."
                                    : "Load Remote Images"}
                            </button>
                        )}

                        {imagesLoaded && (
                            <span className="text-xs font-semibold text-emerald-700">
                                Images loaded
                            </span>
                        )}
                    </div>

                    {!imagesLoaded && (
                        <p className="mt-2 text-xs leading-5 text-[#718096]">
                            Remote images are hidden for privacy.
                            Loading them may notify the sender
                            that this email was viewed.
                        </p>
                    )}

                </div>
            )}

            {error && (
                <p className="mb-2 text-xs text-red-600">
                    {error}
                </p>
            )}

            {/* Sandboxed HTML Email */}
            <iframe
                title={`Email preview ${messageId}`}
                srcDoc={srcDoc}
                sandbox=""
                referrerPolicy="no-referrer"
                className="h-[300px] w-full rounded-xl border border-[#E5E9EE] bg-white"
            />

        </div>
    );
}
