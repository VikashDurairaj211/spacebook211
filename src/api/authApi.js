import api from "./axios";

export const loginUser = async (email, password) => {
  const response = await api.post("/Auth/login", {
    email,
    password,
  });

  return response.data;
};