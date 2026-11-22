import api from "./axios";

export async function uploadKnowledgeDocument({
    file,
    title,
    visibility,
    previousDocumentId,
    effectiveFrom,
}) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("visibility", visibility);

    if (previousDocumentId) {
        formData.append(
            "previous_document_id",
            String(previousDocumentId)
        );

        formData.append("effective_from", effectiveFrom);
    }

    const response = await api.post(
        "/knowledge/documents",
        formData,
        {
            timeout: 120000,
        }
    );

    return response.data;
}

export async function getKnowledgeDocuments() {
    const response = await api.get("/knowledge/documents");
    return response.data;
}


export async function previewKnowledgeDocument(id) {
    const response = await api.get(
        `/knowledge/documents/${id}/preview`,
        { responseType: "blob", timeout: 60000 }
    );
    return response.data;
}

export async function downloadKnowledgeDocument(id) {
    const response = await api.get(
        `/knowledge/documents/${id}/download`,
        { responseType: "blob", timeout: 60000 }
    );
    return response.data;
}

export async function searchKnowledge({
    question,
    mode = "current",
    asOfDate = null,
    limit = 5,
}) {
    const response = await api.post(
        "/knowledge/search",
        {
            question: question.trim(),
            mode,
            limit,
            ...(mode === "historical"
                ? { as_of_date: asOfDate }
                : {}),
        },
        {
            timeout: 120000,
        }
    );

    return response.data;
}

export async function getKnowledgeSource(chunkId) {
    const response = await api.get(
        `/knowledge/sources/${chunkId}`
    );

    return response.data;
}