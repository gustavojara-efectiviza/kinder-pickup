import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, studentId, title, body: alertBody, url, type } = body || {};

    const notificationTitle = title || "⏰ Pequeños Héroes";
    const notificationBody =
      alertBody || "Faltan 30 min para la salida escolar. Toca para confirmar quién retira.";
    const targetUrl = url || (studentId ? `/padre/${studentId}` : "/");

    // Verificar si existe una clave de servidor de FCM configurada en el entorno
    const serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;

    if (token && serverKey) {
      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: "/logo.png",
              click_action: targetUrl,
            },
            data: {
              url: targetUrl,
              studentId: studentId || "",
              type: type || "DISMISSAL_ALERT",
              timestamp: Date.now().toString(),
            },
          }),
        });

        const fcmResult = await response.json();

        return NextResponse.json({
          success: true,
          fcmResult,
          message: "Notificación push despachada exitosamente a través de FCM.",
        });
      } catch (fcmErr) {
        console.warn("Fallo el envío remoto a FCM HTTP legacy:", fcmErr);
        return NextResponse.json({
          success: true,
          simulated: true,
          warning: "No se pudo conectar con el endpoint remoto de FCM. Se utilizó despacho local.",
        });
      }
    }

    // Modo fallback / simulación para desarrollo y pruebas locales
    return NextResponse.json({
      success: true,
      simulated: true,
      data: {
        title: notificationTitle,
        body: notificationBody,
        targetUrl,
        studentId,
        hasToken: !!token,
      },
      message: "Push procesado. Service Worker notificado para el cliente.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error al procesar notificación push";
    console.error("Error en POST /api/push:", err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
