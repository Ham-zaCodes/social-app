"use client";

import { createContext, useContext, useState, useEffect } from "react";
import authService from "@/services/authService";

const AuthContext = createContext(null);

const getUserFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return { id: payload.id, username: payload.username, email: payload.email };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Token se basic user set karo, phir full profile fetch karo (avatar_url ke liye)
  const fetchAndSetFullProfile = async (basicUser) => {
    try {
      const profile = await authService.getUserById(basicUser.id);
      setUser({ ...basicUser, ...profile }); // avatar_url, bio bhi merge ho jaye
    } catch {
      setUser(basicUser); // fallback — basic info se kaam chala lo
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const basicUser = getUserFromToken(token);
      if (basicUser) {
        fetchAndSetFullProfile(basicUser);
      } else {
        localStorage.removeItem("accessToken");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // fetchAndSetFullProfile ke baad loading false karo
  useEffect(() => {
    if (user !== null) setLoading(false);
  }, [user]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    await fetchAndSetFullProfile(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    await fetchAndSetFullProfile(data.user);
    return data.user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Profile update ke baad user state refresh karne ke liye
  const refreshUser = async () => {
    if (!user) return;
    await fetchAndSetFullProfile(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
