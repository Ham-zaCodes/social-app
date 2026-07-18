import axios from "axios";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const localHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];

    if (process.env.NODE_ENV !== "production" && localHosts.includes(hostname)) {
      return `${protocol}//${hostname}:5000/api`;
    }
  }

  return "http://localhost:5000/api";
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

// Request interceptor: har request mein accessToken inject karo
apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: 401 par token clear karke login par bhejo
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} →`,
        error.response?.status,
        error.response?.data
      );
    }
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login")
    ) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
