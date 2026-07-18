import apiClient from "./api";

const postService = {
  getAllPosts: async () => {
    try {
      const response = await apiClient.get("/post");
      return response.data; // { posts: [...] }
    } catch (error) {
      throw error.response
        ? error.response.data
        : new Error("Failed to fetch posts");
    }
  },

  createPost: async (postData) => {
    try {
      const response = await apiClient.post("/post", postData);
      return response.data; // { post: {...} }
    } catch (error) {
      throw error.response
        ? error.response.data
        : new Error("Failed to create post");
    }
  },

  toggleLike: async (postId) => {
    try {
      const response = await apiClient.post(`/post/${postId}/like`);
      return response.data;
    } catch (error) {
      throw error.response
        ? error.response.data
        : new Error("Failed to toggle like");
    }
  },

  editPost: async (postId, content) => {
    try {
      const response = await apiClient.put(`/post/${postId}`, { content });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to edit post");
    }
  },

  addComment: async (postId, content) => {
    try {
      const response = await apiClient.post(`/post/${postId}/comment`, { content });
      return response.data; // { comment: {...} }
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to add comment");
    }
  },

  getComments: async (postId) => {
    try {
      const response = await apiClient.get(`/post/${postId}/comments`);
      return response.data.comments || [];
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to fetch comments");
    }
  },

  deleteComment: async (postId, commentId) => {
    try {
      const response = await apiClient.delete(`/post/${postId}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Failed to delete comment");
    }
  },

  deletePost: async (postId) => {
    try {
      const response = await apiClient.delete(`/post/${postId}`);
      return response.data;
    } catch (error) {
      throw error.response
        ? error.response.data
        : new Error("Failed to delete post");
    }
  },
};

export default postService;
