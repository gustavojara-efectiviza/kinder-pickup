"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import { PickupStatus, RoomId, ShiftType } from "@/types/pickup";
import confetti from "canvas-confetti";
import { Users, AlertCircle, Bell, RefreshCw, Pill, Utensils, MapPin, Timer, Clock, Cake } from "lucide-react";
import { getBirthdayInfo } from "@/core/birthday";

const STATUS_CONFIG: Record<PickupStatus, { label: string; color: string; border: string }> = {
  ABSENT: { label: "Ausente", color: "bg-slate-200 text-slate-600", border: "border-slate-300" },
  PRESENT: { label: "En Sala", color: "bg-emerald-500 text-white", border: "border-emerald-500 shadow-emerald-100" },
  ON_THE_WAY: { label: "En Camino", color: "bg-amber-400 text-slate-900 animate-pulse", border: "border-amber-400 ring-4 ring-amber-300 shadow-amber-200" },
  ARRIVED: { label: "En Puerta", color: "bg-indigo-600 text-white", border: "border-indigo-600 ring-4 ring-indigo-300" },
  DISMISSED: { label: "Retirado", color: "bg-zinc-400 text-white opacity-40", border: "border-zinc-300" },
};

const ROOM_FILTERS: { id: RoomId | "ALL"; label: string }[] = [
  { id: "ALL", label: "TODOS" },
  { id: "SALITA_1", label: "Salita 1 (Bebés)" },
  { id: "SALITA_2", label: "Salita 2" },
  { id: "SALITA_3", label: "Salita 3" },
  { id: "JARDIN", label: "Jardín" },
  { id: "PREESCOLAR", label: "Preescolar" },
];

const SHIFT_FILTERS: { id: ShiftType | "ALL"; label: string }[] = [
  { id: "MANANA", label: "Mañana (07-11)" },
  { id: "TARDE", label: "Tarde (13-17)" },
  { id: "DOBLE_TURNO", label: "Doble Turno" },
  { id: "ALL", label: "Todos" },
];

const ROOM_LABEL: Record<RoomId, string> = {
  SALITA_1: "Salita 1",
  SALITA_2: "Salita 2",
  SALITA_3: "Salita 3",
  JARDIN: "Jardín",
  PREESCOLAR: "Preescolar",
};

function defaultShift(): ShiftType {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes < 12 * 60 + 30 ? "MANANA" : "TARDE";
}

function TVDashboard() {
  const { students, loading, updateStudentStatus, resetDailyStatuses } = usePickupRealtime();
  const [selectedRoom, setSelectedRoom] = useState<RoomId | "ALL">("ALL");
  const [selectedShift, setSelectedShift] = useState<ShiftType | "ALL">(defaultShift);
  const [today, setToday] = useState<Date>(() => new Date());

  // Refresca la fecha para que los conteos de cumpleaños cambien al pasar la medianoche
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevStatusRef = useRef<Map<string, PickupStatus> | null>(null);

  useEffect(() => {
    const playTone = (frequency: number, startOffset: number, duration: number) => {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioCtx) return;
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + startOffset;
        osc.frequency.setValueAtTime(frequency, t0);
        gain.gain.setValueAtTime(0.06, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.start(t0);
        osc.stop(t0 + duration);
      } catch {
        // Silenciar bloqueo de autoplay del navegador
      }
    };

    const current = new Map<string, PickupStatus>(students.map((s) => [s.id, s.status]));
    const prev = prevStatusRef.current;
    prevStatusRef.current = current;
    if (!prev) return; // No sonar con la carga inicial

    let newOnTheWay = false;
    let newArrived = false;
    current.forEach((status, id) => {
      const before = prev.get(id);
      if (before === status) return;
      if (status === "ON_THE_WAY") newOnTheWay = true;
      if (status === "ARRIVED") newArrived = true;
    });

    if (newArrived) {
      // Doble pulso corto A5 para avisar al portón
      playTone(880, 0, 0.15);
      playTone(880, 0.25, 0.15);
    } else if (newOnTheWay) {
      // Tono suave D5 para preparar mochila
      playTone(587.33, 0, 0.3);
    }
  }, [students]);

  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const roomOk = selectedRoom === "ALL" || s.room === selectedRoom;
      const shift = s.schedule?.shift;
      // Los alumnos de doble turno están presentes tanto en la mañana como en la tarde
      const shiftOk =
        selectedShift === "ALL" ||
        shift === selectedShift ||
        (shift === "DOBLE_TURNO" && (selectedShift === "MANANA" || selectedShift === "TARDE"));
      return roomOk && shiftOk;
    });
    // Los ausentes van al final para que el personal se enfoque en quienes están en sala
    return [...list].sort((a, b) => Number(a.status === "ABSENT") - Number(b.status === "ABSENT"));
  }, [students, selectedRoom, selectedShift]);

  const counts = useMemo(() => {
    return {
      present: filteredStudents.filter((s) => s.status === "PRESENT").length,
      onTheWay: filteredStudents.filter((s) => s.status === "ON_THE_WAY").length,
      arrived: filteredStudents.filter((s) => s.status === "ARRIVED").length,
      total: filteredStudents.length,
    };
  }, [filteredStudents]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mr-3 text-amber-400" />
        <span className="text-xl">Conectando a la central en tiempo real...</span>
      </div>
    );
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
      active ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
    }`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col font-sans select-none">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20 text-amber-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel de Recogida &amp; Asistencia</h1>
            <p className="text-xs text-slate-400">Recepción / Control de Salida en Vivo · {counts.total} alumnos</p>
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

        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-slate-500 mx-1.5" />
            {SHIFT_FILTERS.map((f) => (
              <button key={f.id} onClick={() => setSelectedShift(f.id)} className={filterBtn(selectedShift === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            {ROOM_FILTERS.map((f) => (
              <button key={f.id} onClick={() => setSelectedRoom(f.id)} className={filterBtn(selectedRoom === f.id)}>
                {f.label}
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
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 mt-6 flex-1 content-start">
        {filteredStudents.map((student) => {
          const cfg = STATUS_CONFIG[student.status];
          const medication = student.medical?.medication;
          const allergies = student.medical?.allergies || student.allergies;
          const diet = student.medical?.specialDiet;
          const onTheWay = student.status === "ON_THE_WAY";
          const absent = student.status === "ABSENT";
          const birthday = getBirthdayInfo(student.birthDate, today);
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
              className={`relative flex flex-col p-3 rounded-2xl border-2 transition-all cursor-pointer select-none hover:scale-102 ${cfg.border} ${
                onTheWay ? "bg-amber-950/40" : "bg-slate-900"
              } ${absent ? "opacity-40 grayscale" : ""}`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase">{ROOM_LABEL[student.room] ?? student.room}</span>
              </div>

              {birthday?.isSoon && (
                <div
                  className={`mb-1 inline-flex items-center gap-1 self-start text-[11px] font-black px-2 py-0.5 rounded-full border ${
                    birthday.isToday
                      ? "bg-pink-500 text-white border-pink-300 animate-bounce"
                      : "bg-pink-500/15 text-pink-300 border-pink-500/40"
                  }`}
                >
                  <Cake className="w-3 h-3" />
                  {birthday.isToday
                    ? "🎉 ¡HOY CUMPLE!"
                    : `🎂 en ${birthday.daysUntil} ${birthday.daysUntil === 1 ? "día" : "días"}`}
                </div>
              )}

              <div className="flex items-center gap-2.5 my-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate leading-tight text-slate-200">{student.name}</p>
                  {student.schedule && (
                    <span className="text-[10px] text-slate-400">Salida: {student.schedule.exitTime}</span>
                  )}
                </div>
              </div>

              {(medication || allergies || diet) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {medication && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Pill className="w-3 h-3" /> Medicación
                    </span>
                  )}
                  {allergies && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      <AlertCircle className="w-3 h-3" /> {allergies}
                    </span>
                  )}
                  {diet && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      <Utensils className="w-3 h-3" /> {diet}
                    </span>
                  )}
                </div>
              )}

              {onTheWay && (
                <div className="mt-2 pt-2 border-t border-amber-500/30 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                    {student.distanceMeters !== undefined && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {student.distanceMeters} m
                      </span>
                    )}
                    {student.etaMinutes !== undefined && (
                      <span className="inline-flex items-center gap-0.5">
                        <Timer className="w-3 h-3" /> ~{student.etaMinutes} min
                      </span>
                    )}
                  </div>
                  {student.currentTutor && (
                    <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                      <Bell className="w-3 h-3 text-amber-400" />
                      <span className="truncate">{student.currentTutor.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}

export default function TVDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
          <RefreshCw className="animate-spin w-8 h-8 mr-3 text-amber-400" />
          <span className="text-xl">Conectando a la central en tiempo real...</span>
        </div>
      }
    >
      <TVDashboard />
    </Suspense>
  );
}
