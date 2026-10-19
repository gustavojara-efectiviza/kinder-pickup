"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, app } from "@/config/firebase";

interface UseFcmProps {
  studentId: string;
  currentToken?: string;
  studentName?: string;
}

export interface FcmState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  token: string | null;
  isLoading: boolean;
  message: { type: "info" | "success" | "error"; text: string } | null;
  requestPermissionAndGetToken: () => Promise<string | null>;
  sendTestNotification: (customBody?: string) => Promise<boolean>;
  clearMessage: () => void;
}

export function useFcm({ studentId, currentToken, studentName = "el alumno" }: UseFcmProps): FcmState {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [token, setToken] = useState<string | null>(currentToken || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (currentToken && !token) {
      setToken(currentToken);
    }
  }, [currentToken, token]);

  // Chequeo de soporte en el navegador al montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSupport = async () => {
      const hasSW = "serviceWorker" in navigator;
      const hasNotif = "Notification" in window;

      if (!hasSW || !hasNotif) {
        setIsSupported(false);
        setPermission("unsupported");
        return;
      }

      setPermission(Notification.permission);

      try {
        const { isSupported: isFcmSupported } = await import("firebase/messaging");
        const supported = await isFcmSupported();
        setIsSupported(supported);
      } catch (err) {
        console.warn("FCM messaging no soportado directamente en este entorno:", err);
        setIsSupported(hasSW && hasNotif);
      }
    };

    checkSupport();
  }, []);

  const clearMessage = useCallback(() => setMessage(null), []);

  const requestPermissionAndGetToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage({
        type: "error",
        text: "Tu navegador no soporta notificaciones push o Service Workers.",
      });
      return null;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Solicitar permisos de notificación nativos
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== "granted") {
        setMessage({
          type: "error",
          text: permResult === "denied"
            ? "Permisos bloqueados. Habilita las notificaciones en el icono de candado 🔒 de tu navegador."
            : "No se otorgaron los permisos para recibir alertas.",
        });
        setIsLoading(false);
        return null;
      }

      // 2. Registrar el Service Worker de FCM
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.error("Error al registrar firebase-messaging-sw.js:", swErr);
        setMessage({
          type: "error",
          text: "No se pudo registrar el Service Worker en segundo plano.",
        });
        setIsLoading(false);
        return null;
      }

      // 3. Obtener el token FCM con VAPID Key
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      let retrievedToken: string | null = null;

      if (vapidKey && vapidKey !== "TU_CLAVE_VAPID_AQUI") {
        try {
          const { getMessaging, getToken } = await import("firebase/messaging");
          const messaging = getMessaging(app);
          retrievedToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration,
          });
        } catch (fcmErr) {
          console.warn("FCM getToken no completado (clave VAPID o permisos):", fcmErr);
        }
      } else {
        console.info("NEXT_PUBLIC_FIREBASE_VAPID_KEY contiene el valor por defecto. Modo local activado.");
      }

      // 4. Si se obtuvo token FCM, guardarlo en Firestore dentro del perfil del alumno
      if (retrievedToken && studentId) {
        try {
          const studentDocRef = doc(db, "students", studentId);
          await updateDoc(studentDocRef, {
            fcmToken: retrievedToken,
            updatedAt: Date.now(),
          });
          setToken(retrievedToken);
          setMessage({
            type: "success",
            text: "✅ ¡Alertas de salida activadas con éxito en este móvil!",
          });
          setIsLoading(false);
          return retrievedToken;
        } catch (dbErr) {
          console.error("Error al guardar token en Firestore:", dbErr);
          setToken(retrievedToken);
          setMessage({
            type: "success",
            text: "✅ Permiso concedido y token FCM obtenido.",
          });
          setIsLoading(false);
          return retrievedToken;
        }
      }

      // Si aún no hay clave VAPID pero el permiso fue otorgado, notificamos que está listo para test
      setMessage({
        type: "success",
        text: "✅ Permisos concedidos. Puedes pulsar 'Probar Notificación Ahora'. (Recuerda añadir tu VAPID Key en .env.local para envíos push remotos).",
      });
      setIsLoading(false);
      return null;
    } catch (err: unknown) {
      console.error("Error en requestPermissionAndGetToken:", err);
      const errMsg = err instanceof Error ? err.message : "Error inesperado al activar alertas.";
      setMessage({
        type: "error",
        text: errMsg,
      });
      setIsLoading(false);
      return null;
    }
  }, [studentId]);

  const sendTestNotification = useCallback(
    async (customBody?: string): Promise<boolean> => {
      if (typeof window === "undefined") return false;

      const title = "⏰ Pequeños Héroes";
      const body =
        customBody ||
        `Faltan 30 min para la salida de ${studentName}. Toca para confirmar quién retira.`;
      const url = `/padre/${studentId}`;

      setIsLoading(true);

      // Disparar vía Service Worker local (feedback instantáneo y vibración en el móvil)
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const options = {
            body,
            icon: "/logo.png",
            badge: "/logo.png",
            vibrate: [200, 100, 200],
            tag: "kinder-test-push",
            renotify: true,
            data: { url },
          } as unknown as NotificationOptions;
          registration.showNotification(title, options);
        } catch (swErr) {
          console.warn("Fallo showNotification local:", swErr);
        }
      }

      // Despachar a la API route de Next.js
      try {
        const response = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            token: token || currentToken,
            title,
            body,
            url,
          }),
        });

        const data = await response.json();
        setIsLoading(false);

        if (response.ok) {
          setMessage({
            type: "success",
            text: "🚀 Notificación de prueba enviada al dispositivo.",
          });
          return true;
        } else {
          setMessage({
            type: "info",
            text: data.message || "Notificación de prueba disparada localmente en este dispositivo.",
          });
          return true;
        }
      } catch (err) {
        console.warn("Error en /api/push:", err);
        setIsLoading(false);
        setMessage({
          type: "info",
          text: "Notificación de prueba mostrada localmente en la barra superior.",
        });
        return true;
      }
    },
    [studentId, token, currentToken, studentName]
  );

  return {
    isSupported,
    permission,
    token,
    isLoading,
    message,
    requestPermissionAndGetToken,
    sendTestNotification,
    clearMessage,
  };
}
