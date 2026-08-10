import axios from "axios";

// Dynamically use the Vercel environment variable, or fallback to your live Render backend URL
const baseURL = process.env.REACT_APP_API_URL || 
                import.meta.env?.VITE_API_URL || 
                "https://spacebook-505h.onrender.com/api";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;