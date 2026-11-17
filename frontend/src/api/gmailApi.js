import api from "./axios";

export async function getGmailThreads(
    page = 1,
    pageSize = 10
) {
    const { data } = await api.get(
        "/gmail/inbox/threads",
        {
            params: {
                page,
                page_size: pageSize
            }
        }
    );

    return data;
}

export async function getGmailThread(id) {
    const { data } = await api.get(
        `/gmail/inbox/threads/${id}`
    );
    return data;
}

export async function syncGmailInbox(limit = 50) {
    const { data } = await api.post(
        `/gmail/inbox/sync?limit=${limit}`
    );
    return data;
}


export async function downloadGmailAttachment(attachmentId) {
    const response = await api.get(
        `/gmail/attachments/${attachmentId}/download`,
        {
            responseType: "blob"
        }
    );

    return response.data;
}

export async function updateGmailThreadRead(threadId, isRead) {
    const response = await api.patch(
        `/gmail/inbox/threads/${threadId}/read`,
        { is_read: isRead }
    );

    return response.data;
}

export async function getGmailRemoteImage(messageId, imageIndex) {
    const response = await api.get(
        `/gmail/inbox/messages/${messageId}/remote-images/${imageIndex}`,
        {
            responseType: "blob"
        }
    );

    return response.data;
}

export async function getGmailHtmlPreview(messageId) {
    const { data } = await api.get(
        `/gmail/inbox/messages/${messageId}/html-preview`
    );

    return data;
}