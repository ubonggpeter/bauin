"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md border border-border max-w-md w-full p-10 text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-600">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-2">Email verified!</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link
              href="/auth/login"
              className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-xl
                         hover:bg-primary-dark transition-colors text-sm"
            >
              Sign in to BAUIN
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-2">Verification failed</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link
              href="/auth/register"
              className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-xl
                         hover:bg-primary-dark transition-colors text-sm"
            >
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
