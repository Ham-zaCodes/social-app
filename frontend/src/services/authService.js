import apiClient from "./api";

const authService = {
  register: async (userData) => {
    try {
      const { username, email, password } = userData;
      const response = await apiClient.post("/auth/register", { username, email, password });
      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
      }
      return response.data; // { accessToken, user: { id, username, email } }
    } catch (error) {
      throw error.response ? error.response.data : new Error("Signup failed");
    }
  },

  login: async (credentials) => {
    try {
      const response = await apiClient.post("/auth/login", credentials);
      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
      }
      return response.data; // { accessToken, user: { id, username, email } }
    } catch (error) {
      throw error.response ? error.response.data : new Error("Login failed");
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (_) {}
    localStorage.removeItem("accessToken");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  getUserById: async (id) => {
    try {
      const response = await apiClient.get(`/users/${id}/profile`);
      return response.data.profile;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to fetch user");
    }
  },
};

export default authService;
