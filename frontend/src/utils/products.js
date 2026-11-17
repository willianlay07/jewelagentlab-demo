
import { API_BASE } from "../api/axios";

export function asList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    return data?.items || data?.products || data?.results || [];
}

export function imageUrl(image) {
    const path = typeof image === "string"
        ? image
        : image?.image_path ||
          image?.url ||
          image?.image_url ||
          image?.path ||
          image?.file_url;

    if (!path) {
        return null;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${API_BASE}/${String(path).replace(/^\/+/, "")}`;
}

export function price(v) {
    return v === null || v === undefined
        ? "—"
        : `S$${Number(v).toLocaleString("en-SG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
}

export function attributesText(attrs) {
    return Object.entries(attrs || {})
        .map(([k, v]) => {
            return `${k.replaceAll("_", " ")}: ${String(v)}`;
        })
        .join(" · ");
}
