"use client";

import React, { Suspense } from "react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import { CheckCircle2, Navigation, AlertTriangle, Clock } from "lucide-react";
import { useParams } from "next/navigation";

function ParentContent() {
  const params = useParams();
  const studentId = params?.id as string;
  const { students, updateStudentStatus } = usePickupRealtime();

  const student = students.find((s) => s.id === studentId);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-sans">
        <p className="text-sm">Buscando alumno o enlace no válido ({studentId})...</p>
      </div>
    );
  }

  const handleNotifyDeparture = () => {
    updateStudentStatus(student.id, "ON_THE_WAY", {
      id: "tutor-demo",
      name: "Papá / Mamá (Demo)",
      relationship: "PAPÁ",
      phone: "+595981000000"
    });
  };

  const handleNotifyArrival = () => {
    updateStudentStatus(student.id, "ARRIVED");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto font-sans">
      <header className="text-center pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
          Pase Digital de Recogida
        </span>
        <h1 className="text-2xl font-black text-white mt-3">{student.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Sala asignada: {student.room}</p>
      </header>

      <section className="bg-slate-900 rounded-3xl p-6 border border-slate-800 text-center my-6 shadow-xl">
        <img
          src={student.photoUrl}
          alt={student.name}
          className="w-24 h-24 mx-auto rounded-2xl bg-slate-800 border border-slate-700 mb-4"
        />
        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-slate-800 text-amber-400 border border-slate-700">
          Estado: {student.status}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Al presionar un botón, la pantalla del aula y recepción se actualizan al instante.
        </p>
      </section>

      <footer className="space-y-3 pb-4">
        <button
          onClick={handleNotifyDeparture}
          disabled={student.status === "ON_THE_WAY" || student.status === "ARRIVED" || student.status === "DISMISSED"}
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-400/10"
        >
          <Navigation className="w-5 h-5 fill-slate-950" />
          Voy en Camino al Kinder
        </button>

        <button
          onClick={handleNotifyArrival}
          disabled={student.status !== "ON_THE_WAY"}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
        >
          <CheckCircle2 className="w-5 h-5" />
          Estoy en la Puerta
        </button>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => alert("Aviso enviado a recepción: Retraso estimado de 15 minutos")}
            className="flex-1 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4 text-slate-400" /> Retraso (15m)
          </button>
          <button
            onClick={() => alert("Aviso urgente enviado a recepción")}
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
          Cargando pase de recogida...
        </div>
      }
    >
      <ParentContent />
    </Suspense>
  );
}
