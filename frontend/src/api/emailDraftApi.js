import api from "./axios";

export async function getEmailDrafts() {
    const { data } = await api.get("/gmail/drafts");
    return data;
}

export async function generateEmailDraft(messageId) {
    const { data } = await api.post(
        `/gmail/drafts/generate/${messageId}`
    );
    return data;
}

export async function updateEmailDraft(draftId, payload) {
    const { data } = await api.patch(
        `/gmail/drafts/${draftId}`,
        payload
    );
    return data;
}

export async function approveEmailDraft(draftId) {
    const { data } = await api.post(
        `/gmail/drafts/${draftId}/approve`
    );
    return data;
}

export async function rejectEmailDraft(draftId) {
    const { data } = await api.post(
        `/gmail/drafts/${draftId}/reject`
    );
    return data;
}

export async function getEmailSendStatus(draftId) {
    const { data } = await api.get(
        `/gmail/drafts/${draftId}/send-status`
    );

    return data;
}

export async function sendApprovedEmail(draftId) {
    const { data } = await api.post(
        `/gmail/drafts/${draftId}/send`,
        { confirm: true }
    );

    return data;
}

export async function getEmailSendPreview(draftId) {
    const { data } = await api.get(
        `/gmail/drafts/${draftId}/send-preview`
    );

    return data;
}