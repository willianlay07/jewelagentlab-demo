import api from "./axios";

export const listProducts = async () => {
    const response = await api.get("/products");

    return response.data;
};

export const getProduct = async (id) => {
    const response = await api.get(`/products/${id}`);

    return response.data;
};

export const createProduct = async (data) => {
    const response = await api.post("/products", data);

    return response.data;
};

export const updateProduct = async (id, data) => {
    const response = await api.patch(
        `/products/${id}`,
        data
    );

    return response.data;
};

export const uploadImages = async (id, files) => {
    const form = new FormData();

    Array.from(files).forEach((file) => {
        form.append("files", file);
    });

    const response = await api.post(
        `/products/${id}/images`,
        form,
        {
            timeout: 120000
        }
    );

    return response.data;
};

export const analyzeProduct = async (id) => {
    const response = await api.post(
        `/products/${id}/analyze`,
        null,
        {
            timeout: 120000
        }
    );

    return response.data;
};

export const submitProduct = async (id) => {
    const response = await api.post(
        `/products/${id}/submit`
    );

    return response.data;
};