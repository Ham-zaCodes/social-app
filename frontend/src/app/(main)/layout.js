"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/shared/Sidebar";

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <svg
          className="animate-spin h-8 w-8 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen w-full overflow-hidden bg-[#0B0F19] text-gray-100 selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-3 sm:px-6 lg:flex-row lg:px-8 lg:gap-8">
        <Sidebar />
        <div className="flex-1 min-w-0 h-full min-h-0 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
