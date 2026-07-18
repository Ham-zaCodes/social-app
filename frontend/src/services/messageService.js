import apiClient from "./api";

const messageService = {
  getRooms: async () => {
    const res = await apiClient.get("/messages/rooms");
    return res.data;
  },

  getRoomMessages: async (roomId) => {
    const res = await apiClient.get(`/messages/room/${roomId}`);
    return res.data;
  },

  sendMessage: async (recipientId, messageText) => {
    const res = await apiClient.post("/messages/send", { recipientId, messageText });
    return res.data;
  },

  // Mutual follows — jinhe message kar sakte hain
  getMutualFollows: async (userId) => {
    const [followersRes, followingRes] = await Promise.all([
      apiClient.get(`/users/${userId}/followers`),
      apiClient.get(`/users/${userId}/following`),
    ]);
    const followers = followersRes.data.followers || [];
    const following = followingRes.data.following || [];
    const followerIds = new Set(followers.map((u) => u.id));
    return following.filter((u) => followerIds.has(u.id));
  },
};

export default messageService;
