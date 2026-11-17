import axios from "axios";

export const API_BASE = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const api = axios.create(
    {
        baseURL: API_BASE,
        timeout: 60000
    }
)

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("orro_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export function errorText(e) {
    if (e?.response?.status === 401) {
        return "Unauthorized. Please log in again.";
    }

    const detail = e?.response?.data?.detail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail.map((x) => x.msg).join("; ");
    }

    return e.message || "Request failed";
}

export default api;