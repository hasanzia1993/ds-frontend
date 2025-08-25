// src/axiosInstance.js
import axios from "axios";
import { BACKEND_URL } from "./constants";

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
});

// Add a request interceptor to include the JWT
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
      console.warn("JWT expired or unauthorized. Logging out...");
      // Optionally, you can implement logic to refresh the token or redirect
      localStorage.removeItem("jwtToken");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
