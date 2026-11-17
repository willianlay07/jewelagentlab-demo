import api from "./axios";

export const searchProducts = async (question, limit = 5) => {
    const response = await api.post(
        "/ai-search",
        {
            question: question,
            limit: limit
        },
        {
            timeout: 120000
        }
    );

    return response.data;
};