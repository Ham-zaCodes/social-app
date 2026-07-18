import apiClient from "./api";

const userService = {
  getSuggestions: async () => {
    try {
      const response = await apiClient.get("/users/suggestions");
      return response.data.users || [];
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to fetch suggestions");
    }
  },

  toggleFollow: async (userId) => {
    try {
      const response = await apiClient.post(`/users/${userId}/follow`);
      return response.data; // { followed: true/false }
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to toggle follow");
    }
  },
};

export default userService;
