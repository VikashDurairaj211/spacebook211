import axios from "axios";

const client = axios.create({
  baseURL: "https://spacebook-505h.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach JWT token to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("spacebook_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors and session timeout
client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("spacebook_token");
      localStorage.removeItem("spacebook_user");

      // Dispatch custom event for session expiry modal popup
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.dispatchEvent(new Event("spacebook_session_expired"));
      }
    }

    return Promise.reject(error);
  }
);

export default client;
