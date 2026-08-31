"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          workspaceName,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to create account");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-6 py-10">
      
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-lg">
          <span className="text-2xl text-[#020617]">✦</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          LOOP
        </h1>

        <p className="text-slate-400 mt-2 text-center">
          Turn customer feedback into decisions.
        </p>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-8 shadow-2xl">

        <div className="mb-7">
          <h2 className="text-2xl font-bold">
            Create your account
          </h2>

          <p className="text-slate-400 mt-2">
            Set up your feedback intelligence workspace.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
            />
          </div>

          {/* Workspace */}
          <div>
            <label
              htmlFor="workspaceName"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Workspace name
            </label>

            <input
              id="workspaceName"
              type="text"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="My Company"
              required
              className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              required
              className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create your LOOP account"}
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-white hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-7 text-sm text-slate-500">
        AI-powered customer feedback intelligence
      </p>
    </main>
  );
}