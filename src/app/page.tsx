"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import { PickupStatus, RoomId } from "@/types/pickup";
import confetti from "canvas-confetti";
import { Users, AlertCircle, Bell, RefreshCw } from "lucide-react";

const STATUS_CONFIG: Record<PickupStatus, { label: string; color: string; border: string }> = {
  ABSENT: { label: "Ausente", color: "bg-slate-200 text-slate-600", border: "border-slate-300" },
  PRESENT: { label: "En Sala", color: "bg-emerald-500 text-white", border: "border-emerald-500 shadow-emerald-100" },
  ON_THE_WAY: { label: "En Camino", color: "bg-amber-400 text-slate-900 animate-pulse", border: "border-amber-400 ring-4 ring-amber-300 shadow-amber-200" },
  ARRIVED: { label: "En Puerta", color: "bg-indigo-600 text-white", border: "border-indigo-600 ring-4 ring-indigo-300" },
  DISMISSED: { label: "Retirado", color: "bg-zinc-400 text-white opacity-40", border: "border-zinc-300" }
};

export default function TVDashboardPage() {
  const { students, loading, updateStudentStatus, resetDailyStatuses } = usePickupRealtime();
  const [selectedRoom, setSelectedRoom] = useState<RoomId | "ALL">("ALL");

  useEffect(() => {
    const hasIncoming = students.some((s) => s.status === "ON_THE_WAY");
    if (hasIncoming) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        }
      } catch {
        // Silenciar bloqueo de autoplay del navegador
      }
    }
  }, [students]);

  const filteredStudents = useMemo(() => {
    return selectedRoom === "ALL"
      ? students
      : students.filter((s) => s.room === selectedRoom);
  }, [students, selectedRoom]);

  const counts = useMemo(() => {
    return {
      present: students.filter((s) => s.status === "PRESENT").length,
      onTheWay: students.filter((s) => s.status === "ON_THE_WAY").length,
      arrived: students.filter((s) => s.status === "ARRIVED").length,
      total: students.length
    };
  }, [students]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mr-3 text-amber-400" />
        <span className="text-xl">Conectando a la central en tiempo real...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col font-sans select-none">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20 text-amber-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel de Recogida & Asistencia</h1>
            <p className="text-xs text-slate-400">Recepción / Control de Salida en Vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
            <span className="block text-2xl font-black text-emerald-400">{counts.present}</span>
            <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">En Sala</span>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <span className="block text-2xl font-black text-amber-400">{counts.onTheWay}</span>
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">En Camino</span>
          </div>
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center">
            <span className="block text-2xl font-black text-indigo-400">{counts.arrived}</span>
            <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">En Puerta</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          {(["ALL", "BEBES", "MATERNAL", "PREESCOLAR"] as const).map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedRoom === room ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
            >
              {room === "ALL" ? "TODOS" : room}
            </button>
          ))}
          <button
            onClick={() => resetDailyStatuses()}
            title="Reiniciar estados del día"
            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors ml-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3.5 mt-6 flex-1">
        {filteredStudents.map((student) => {
          const cfg = STATUS_CONFIG[student.status];
          return (
            <div
              key={student.id}
              onClick={() => {
                if (student.status === "ON_THE_WAY") {
                  updateStudentStatus(student.id, "ARRIVED");
                } else if (student.status === "ARRIVED") {
                  confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
                  updateStudentStatus(student.id, "DISMISSED");
                }
              }}
              className={`relative flex flex-col p-3 rounded-2xl bg-slate-900 border-2 transition-all cursor-pointer select-none hover:scale-102 ${cfg.border}`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase">{student.room}</span>
              </div>

              <div className="flex items-center gap-2.5 my-1">
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate leading-tight text-slate-200">{student.name}</p>
                  {student.allergies && (
                    <span className="inline-flex items-center text-[10px] text-rose-400 gap-0.5 mt-0.5">
                      <AlertCircle className="w-3 h-3" /> Alergia
                    </span>
                  )}
                </div>
              </div>

              {student.currentTutor && student.status === "ON_THE_WAY" && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-amber-300 font-medium flex items-center gap-1">
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span className="truncate">{student.currentTutor.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}