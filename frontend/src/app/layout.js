import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// AuthProvider ko import kiya taake global state active ho sake
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Social App",
  description: "A professional full-stack social media application",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-gray-900 bg-white">
        {/* AuthProvider ko body ke andar wrap kar diya */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
