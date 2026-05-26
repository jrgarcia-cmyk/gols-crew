import { LoginForm } from "./login-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In — GOLS Crew" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-black text-2xl">G</span>
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-2xl tracking-tight">
            GOLS Crew
          </h1>
          <p className="text-gray-400 text-sm mt-1">Game On Live Studio</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-gray-900 font-semibold text-xl mb-6 text-center">
          Sign In
        </h2>
        <LoginForm />
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center">
        New contractor?{" "}
        <a href="/intake" className="text-red-500 hover:underline">
          Complete your intake form
        </a>
      </p>
    </div>
  );
}
