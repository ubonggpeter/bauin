"use client";
import { useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const bytes   = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes as Uint8Array<ArrayBuffer>;
}

export default function PushManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        // Only prompt if user has granted or we haven't asked yet
        if (Notification.permission !== "granted") {
          const result = await Notification.requestPermission();
          if (result !== "granted") return;
        }

        // Fetch VAPID public key
        const keyRes = await fetch("/api/push/vapid-key");
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json() as { publicKey: string };

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(subscription.toJSON()),
        });
      } catch {
        // Non-critical — silently fail
      }
    }

    // Wait until SW is active before subscribing
    navigator.serviceWorker.ready.then(subscribe);
  }, []);

  return null;
}
