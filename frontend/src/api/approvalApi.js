import api from "./axios";

export const pendingApprovals = async () => {
    const response = await api.get(
        "/admin/approvals/pending"
    );

    return response.data;
};

export const approveProduct = async (id) => {
    const response = await api.post(
        `/admin/approvals/${id}/approve`
    );

    return response.data;
};

// Verify the rejection body with your existing Phase 2 schema.
export const rejectProduct = async (id, reason) => {
    const response = await api.post(
        `/admin/approvals/${id}/reject`,
        {
            reason: reason
        }
    );

    return response.data;
};