import api from "./axios";

export const listStaff = async () => {
    const response = await api.get("/admin/staff");

    return response.data;
};

export const createStaff = async (data) => {
    const response = await api.post(
        "/admin/staff",
        data
    );

    return response.data;
};

export const updateStaff = async (id, data) => {
    const response = await api.patch(
        `/admin/staff/${id}`,
        data
    );

    return response.data;
};