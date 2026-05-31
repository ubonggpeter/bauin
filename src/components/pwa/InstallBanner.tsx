"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setPrompt(null);
      setDismissed(true);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom">
      <div
        className="mx-auto max-w-md rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3"
        style={{ background: "#1A6659", color: "#fff" }}
      >
        <Image src="/icons/icon-192.png" alt="BAUIN" width={40} height={40} className="rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Add BAUIN to your home screen</p>
          <p className="text-xs opacity-75 mt-0.5">Faster access, works offline</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold"
          style={{ background: "#F0B429", color: "#1A1A2E" }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 opacity-60 hover:opacity-100 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
