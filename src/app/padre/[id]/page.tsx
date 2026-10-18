"use client";

import React, { Suspense, useState } from "react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import { useGeofence } from "@/core/use-geofence";
import { CheckCircle2, Navigation, AlertTriangle, Clock, Radio } from "lucide-react";
import { useParams } from "next/navigation";

function ParentContent() {
  const params = useParams();
  const studentId = params?.id as string;
  const { students, updateStudentStatus } = usePickupRealtime();
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);

  const student = students.find((s) => s.id === studentId);

  const { distance, eta, accuracy, error, isWatching } = useGeofence({
    currentStatus: student?.status || "ABSENT",
    enabled: gpsEnabled && !!student && student.status !== "DISMISSED",
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto font-sans">
      <header className="text-center pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
          Pase Digital &amp; Geofence
        </span>
        <h1 className="text-2xl font-black text-white mt-3">{student.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Sala: {student.room}</p>
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
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-400/10"
        >
          <Navigation className="w-5 h-5 fill-slate-950" />
          Forzar &quot;En Camino&quot; Manual
        </button>

        <button
          onClick={handleNotifyArrival}
          disabled={student.status !== "ON_THE_WAY"}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
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
