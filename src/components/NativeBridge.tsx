"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Wires the native app shell: Android back button, push notifications, and opening links from notifications. */
export function NativeBridge() {
  const router = useRouter();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");
      const back = await App.addListener("backButton", ({ canGoBack }) => (canGoBack ? window.history.back() : App.exitApp()));
      const handles = [back];
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        handles.push(await PushNotifications.addListener("registration", ({ value }) => {
          fetch("/api/push/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }) }).catch(() => {});
        }));
        handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          const url = (notification.data as { url?: string } | undefined)?.url;
          if (url && url.startsWith("/")) router.push(url);
        }));
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") await PushNotifications.register();
      } catch { /* push not configured in this build */ }
      cleanup = () => handles.forEach((h) => h.remove());
    })();
    return () => cleanup?.();
  }, [router]);
  return null;
}
