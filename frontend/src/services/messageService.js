import apiClient from "./api";

let roomsCache = null;
let roomsCacheTime = 0;
let roomsRequestPromise = null;

const roomMessagesCache = new Map();
const roomMessagesRequestPromises = new Map();

const isRateLimited = (error) => error?.response?.status === 429;

const messageService = {
  getRooms: async () => {
    const now = Date.now();
    if (roomsCache && now - roomsCacheTime < 30000) {
      return roomsCache;
    }

    if (roomsRequestPromise) {
      return roomsRequestPromise;
    }

    roomsRequestPromise = apiClient
      .get("/messages/rooms")
      .then((res) => {
        roomsCache = res.data;
        roomsCacheTime = Date.now();
        return res.data;
      })
      .catch((error) => {
        if (isRateLimited(error)) {
          return roomsCache || [];
        }
        throw error;
      })
      .finally(() => {
        roomsRequestPromise = null;
      });

    return roomsRequestPromise;
  },

  getRoomMessages: async (roomId) => {
    if (!roomId) return [];

    const cacheKey = `room:${roomId}`;
    const cached = roomMessagesCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 30000) {
      return cached.data;
    }

    if (roomMessagesRequestPromises.has(cacheKey)) {
      return roomMessagesRequestPromises.get(cacheKey);
    }

    const requestPromise = apiClient
      .get(`/messages/room/${roomId}`)
      .then((res) => {
        roomMessagesCache.set(cacheKey, { data: res.data, time: Date.now() });
        return res.data;
      })
      .catch((error) => {
        if (isRateLimited(error)) {
          return cached?.data || [];
        }
        throw error;
      })
      .finally(() => {
        roomMessagesRequestPromises.delete(cacheKey);
      });

    roomMessagesRequestPromises.set(cacheKey, requestPromise);
    return requestPromise;
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
