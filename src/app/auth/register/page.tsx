"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", referralCode: "" });
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("bauin_token", data.token);
        window.location.href = "/dashboard";
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">BAUIN</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { id: "name", label: "Full Name", type: "text", placeholder: "John Doe" },
            { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { id: "password", label: "Password", type: "password", placeholder: "••••••••" },
            { id: "referralCode", label: "Referral Code (optional)", type: "text", placeholder: "BAUIN-XXXXX" },
          ].map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-text-dark mb-1">{field.label}</label>
              <input
                type={field.type}
                required={field.id !== "referralCode"}
                value={form[field.id as keyof typeof form]}
                onChange={(e) => update(field.id, e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
