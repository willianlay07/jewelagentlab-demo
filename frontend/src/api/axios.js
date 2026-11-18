
import axios from "axios";

export const API_BASE = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "orro_token";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 60000
});

// Attach JWT to API requests
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Handle expired or invalid JWT globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";

        const isLoginRequest =
            /(^|\/)auth\/login\/?(\?|$)/.test(requestUrl);

        const hasToken = Boolean(
            sessionStorage.getItem(TOKEN_KEY)
        );

        if (
            status === 401 &&
            hasToken &&
            !isLoginRequest
        ) {
            sessionStorage.removeItem(TOKEN_KEY);

            if (window.location.pathname !== "/login") {
                window.location.replace(
                    "/login?reason=session-expired"
                );
            }
        }

        return Promise.reject(error);
    }
);

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