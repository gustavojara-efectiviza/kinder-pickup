"use client";

import React, { Suspense, useState } from "react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import { useGeofence } from "@/core/use-geofence";
import { useFcm } from "@/core/use-fcm";
import { CheckCircle2, Navigation, AlertTriangle, Clock, Radio, Cake, XCircle, Bell, BellRing, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { getBirthdayInfo } from "@/core/birthday";

function ParentContent() {
  const params = useParams();
  const studentId = params?.id as string;
  const { students, updateStudentStatus } = usePickupRealtime();
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);
  const [now] = useState<Date>(() => new Date());

  const student = students.find((s) => s.id === studentId);
  const isAbsent = student?.status === "ABSENT";

  const {
    permission,
    isLoading: isFcmLoading,
    message: fcmMessage,
    requestPermissionAndGetToken,
    sendTestNotification,
    clearMessage,
  } = useFcm({
    studentId: student?.id || "",
    currentToken: student?.fcmToken,
    studentName: student?.name || "el alumno",
  });

  const { distance, eta, accuracy, error, isWatching } = useGeofence({
    currentStatus: student?.status || "ABSENT",
    // El rastreo GPS queda inactivo mientras el alumno esté registrado como ausente
    enabled: gpsEnabled && !!student && student.status !== "DISMISSED" && !isAbsent,
    onStateChange: (newState, dist, calculatedEta) => {
      if (!student) return;
      updateStudentStatus(
        student.id,
        newState,
        {
          id: "tutor-demo",
          name: "Papá / Mamá (GPS Auto)",
          relationship: "PAPÁ",
          phone: "+595981000000",
        },
        calculatedEta,
        dist
      );
    },
  });

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-sans">
        <p className="text-sm">Buscando alumno o identificador no válido ({studentId})...</p>
      </div>
    );
  }

  const handleNotifyDeparture = () => {
    updateStudentStatus(student.id, "ON_THE_WAY", {
      id: "tutor-demo",
      name: "Papá / Mamá (Manual)",
      relationship: "PAPÁ",
      phone: "+595981000000",
    });
  };

  const handleNotifyArrival = () => {
    updateStudentStatus(student.id, "ARRIVED");
  };

  const handleConfirmAttendance = () => {
    updateStudentStatus(student.id, "PRESENT");
  };

  const handleMarkAbsent = () => {
    updateStudentStatus(student.id, "ABSENT");
  };

  const birthday = getBirthdayInfo(student.birthDate, now);

  // Ventana de check-in: mientras no haya iniciado la salida y antes de la hora de retiro pactada
  const [exitH, exitM] = (student.schedule?.exitTime ?? "23:59").split(":").map(Number);
  const beforeExit = now.getHours() * 60 + now.getMinutes() < exitH * 60 + exitM;
  const showCheckIn = (student.status === "ABSENT" || student.status === "PRESENT") && beforeExit;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto font-sans">
      <header className="text-center pt-2 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Pequeños Héroes"
          className="h-16 w-auto object-contain rounded-2xl bg-white/95 p-1.5 border border-sky-400/30 shadow-lg mb-2"
        />
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
            PEQUEÑOS HÉROES
          </span>
          <span className="text-[10px] text-slate-500">•</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            EDI N° 8161
          </span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full">
          Pase Digital &amp; Geofence
        </span>
        <h1 className="text-2xl font-black text-white mt-3">{student.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Sala: {student.room}</p>
        {birthday?.isSoon && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-pink-300 bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 rounded-full">
            <Cake className="w-4 h-4" />
            {birthday.isToday
              ? `¡Feliz cumpleaños, ${student.name.split(" ")[0]}! 🎉`
              : `¡Pronto cumple años! 🎂 en ${birthday.daysUntil} ${birthday.daysUntil === 1 ? "día" : "días"}`}
          </p>
        )}

        {/* Notificaciones Web Push de Salida Escolar */}
        <div className="mt-4 w-full text-left bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Alertas de Salida en Celular
                  {permission === "granted" && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Activas
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Vibración 30 min antes para confirmar retiro
                </p>
              </div>
            </div>
          </div>

          {permission === "granted" ? (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>✅ Alertas Activas en este Móvil</span>
              </div>
              <button
                onClick={() => sendTestNotification()}
                disabled={isFcmLoading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-[0.99] border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {isFcmLoading ? "Despachando alerta..." : "🧪 Probar Notificación Ahora"}
              </button>
            </div>
          ) : (
            <button
              onClick={requestPermissionAndGetToken}
              disabled={isFcmLoading}
              className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              {isFcmLoading ? "Activando..." : "🔔 Activar Alertas de Salida en mi Celular"}
            </button>
          )}

          {fcmMessage && (
            <div
              className={`mt-2.5 p-2 rounded-xl text-[11px] leading-tight flex items-start justify-between gap-2 ${
                fcmMessage.type === "success"
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                  : fcmMessage.type === "error"
                  ? "bg-rose-950/40 text-rose-300 border border-rose-500/30"
                  : "bg-sky-950/40 text-sky-300 border border-sky-500/30"
              }`}
            >
              <span>{fcmMessage.text}</span>
              <button
                onClick={clearMessage}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {showCheckIn && (
          <div className="mt-4 text-left bg-slate-900 border border-amber-400/30 rounded-2xl p-4 shadow-lg">
            {isAbsent ? (
              <>
                <p className="text-sm font-bold text-slate-200">Registrado como ausente</p>
                <p className="text-xs text-slate-400 mt-1">
                  El rastreo por GPS permanece inactivo por hoy.
                </p>
                <button
                  onClick={handleConfirmAttendance}
                  className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                >
                  Fue un error: reactivar asistencia
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-white">¿Asiste hoy al Kinder?</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleConfirmAttendance}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Asistencia Hoy
                  </button>
                  <button
                    onClick={handleMarkAbsent}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> No asistirá hoy
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Telemetría y Estado de GPS */}
      <section className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-center my-4 shadow-xl">
        <img
          src={student.photoUrl}
          alt={student.name}
          className="w-20 h-20 mx-auto rounded-2xl bg-slate-800 border border-slate-700 mb-3 object-cover"
        />
        <div className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-slate-800 text-amber-400 border border-slate-700">
          Estado: {student.status}
        </div>

        {/* Panel de Distancia GPS */}
        <div className="bg-slate-950/70 rounded-2xl p-3 border border-slate-800/80 text-left space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Radio className={`w-3.5 h-3.5 ${isWatching ? "text-emerald-400 animate-pulse" : "text-slate-600"}`} />
              Radar Geocerca:
            </span>
            <button
              onClick={() => setGpsEnabled(!gpsEnabled)}
              className="text-[10px] uppercase font-bold text-amber-400 underline"
            >
              {gpsEnabled ? "Desactivar" : "Activar"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400">Distancia al Kinder:</span>
            <span className="font-mono font-bold text-white">
              {distance !== null ? `${distance} metros` : "Calculando..."}
            </span>
          </div>

          {eta !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tiempo Estimado (ETA):</span>
              <span className="font-mono font-bold text-amber-400">~{eta} min</span>
            </div>
          )}

          {accuracy !== null && (
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Precisión GPS:</span>
              <span>±{accuracy}m</span>
            </div>
          )}

          {error && <p className="text-[10px] text-rose-400 pt-1">Aviso: {error}</p>}
        </div>
      </section>

      {/* Controles de Emergencia / Respaldo Manual */}
      <footer className="space-y-3 pb-4">
        <button
          onClick={handleNotifyDeparture}
          disabled={student.status === "ON_THE_WAY" || student.status === "ARRIVED" || student.status === "DISMISSED"}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 border border-blue-400/30"
        >
          <Navigation className="w-5 h-5 fill-white" />
          Forzar &quot;En Camino&quot; Manual
        </button>

        <button
          onClick={handleNotifyArrival}
          disabled={student.status !== "ON_THE_WAY"}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 border border-emerald-400/30"
        >
          <CheckCircle2 className="w-5 h-5" />
          Forzar &quot;En Puerta&quot; Manual
        </button>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => alert("Aviso de retraso registrado")}
            className="flex-1 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4 text-slate-400" /> +15 min
          </button>
          <button
            onClick={() => alert("Alerta prioritaria enviada a dirección")}
            className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Emergencia
          </button>
        </div>
      </footer>
    </main>
  );
}

export default function ParentPickupView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-sans">
          Cargando telemetría...
        </div>
      }
    >
      <ParentContent />
    </Suspense>
  );
}
