"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Search, Printer, ExternalLink, Tv, Users, Clock, ArrowLeft, RefreshCw, Phone } from "lucide-react";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import type { RoomId, ShiftType } from "@/types/pickup";

const ROOMS: { id: RoomId; label: string }[] = [
  { id: "SALITA_1", label: "Salita 1 (Bebés)" },
  { id: "SALITA_2", label: "Salita 2" },
  { id: "SALITA_3", label: "Salita 3" },
  { id: "JARDIN", label: "Jardín" },
  { id: "PREESCOLAR", label: "Preescolar" },
];

const SHIFTS: { id: ShiftType; label: string }[] = [
  { id: "MANANA", label: "Mañana" },
  { id: "TARDE", label: "Tarde" },
  { id: "DOBLE_TURNO", label: "Doble Turno" },
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Origen del host: vacío en SSR y el real en el cliente (sin errores de hidratación)
const subscribeNoop = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

const printStyles = `
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default function QrCredentialsPage() {
  const { students, loading } = usePickupRealtime();
  const origin = useSyncExternalStore(subscribeNoop, getOrigin, getServerOrigin);

  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<RoomId | "ALL">("ALL");
  const [shiftFilter, setShiftFilter] = useState<ShiftType | "ALL">("ALL");
  const [printOnlyId, setPrintOnlyId] = useState<string | null>(null);

  // Al terminar la impresión individual, se vuelven a mostrar todas las credenciales
  useEffect(() => {
    const reset = () => setPrintOnlyId(null);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return students.filter((s) => {
      if (q && !normalize(s.name).includes(q)) return false;
      if (roomFilter !== "ALL" && s.room !== roomFilter) return false;
      if (shiftFilter !== "ALL" && s.schedule?.shift !== shiftFilter) return false;
      return true;
    });
  }, [students, search, roomFilter, shiftFilter]);

  const printAll = () => {
    setPrintOnlyId(null);
    setTimeout(() => window.print(), 50);
  };

  const printOne = (id: string) => {
    setPrintOnlyId(id);
    setTimeout(() => window.print(), 80);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mr-3 text-amber-400" />
        <span className="text-xl">Cargando credenciales...</span>
      </div>
    );
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
      active ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
    }`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans print:bg-white print:p-0 print:text-black">
      <style>{printStyles}</style>

      {/* Cabecera y controles (ocultos al imprimir) */}
      <div className="print:hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20 text-amber-400">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Credenciales &amp; Códigos QR</h1>
              <p className="text-xs text-slate-400">
                Pases oficiales de retiro · {filtered.length} de {students.length} alumnos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Admin
            </a>
            <a
              href="/tv"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Tv className="w-4 h-4" /> TV
            </a>
            <button
              onClick={printAll}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 text-xs font-black transition-colors shadow-lg shadow-amber-400/10"
            >
              <Printer className="w-4 h-4" /> Imprimir Todo ({filtered.length})
            </button>
          </div>
        </header>

        <section className="mt-5 space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alumno por nombre..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
              <button onClick={() => setRoomFilter("ALL")} className={filterBtn(roomFilter === "ALL")}>
                Todas las salas
              </button>
              {ROOMS.map((r) => (
                <button key={r.id} onClick={() => setRoomFilter(r.id)} className={filterBtn(roomFilter === r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <button onClick={() => setShiftFilter("ALL")} className={filterBtn(shiftFilter === "ALL")}>
                Todos
              </button>
              {SHIFTS.map((s) => (
                <button key={s.id} onClick={() => setShiftFilter(s.id)} className={filterBtn(shiftFilter === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Grilla de credenciales: 2 columnas / 6 por hoja A4 al imprimir */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 print:mt-0 print:grid-cols-2 print:gap-[6mm]">
        {filtered.map((student) => {
          const url = `${origin}/padre/${student.id}`;
          const room = ROOMS.find((r) => r.id === student.room)?.label ?? student.room;
          const shift = SHIFTS.find((s) => s.id === student.schedule?.shift)?.label;
          const tutor = student.primaryTutor;
          const hiddenOnPrint = printOnlyId !== null && printOnlyId !== student.id;

          return (
            <article
              key={student.id}
              className={`break-inside-avoid flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-xl print:shadow-none print:h-[88mm] ${
                hiddenOnPrint ? "print:hidden" : ""
              }`}
            >
              <div className="bg-amber-400 text-slate-950 text-center py-2 text-[11px] font-black uppercase tracking-[0.18em]">
                Kinder Pickup · Pase Oficial
              </div>

              <div className="flex items-center gap-3 px-4 pt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight text-slate-900 break-words">{student.name}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">{room}</span>
                    {shift && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {shift}
                      </span>
                    )}
                    {student.schedule?.exitTime && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                        <Clock className="w-3 h-3" /> Salida {student.schedule.exitTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 mt-auto">
                <div className="flex-shrink-0 p-1.5 bg-white border border-slate-300 rounded-lg">
                  {origin ? (
                    <QRCodeSVG value={url} size={128} level="M" marginSize={0} />
                  ) : (
                    <div className="w-[128px] h-[128px] bg-slate-100" />
                  )}
                </div>
                <div className="min-w-0 text-[11px] text-slate-600 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tutor autorizado</p>
                  {tutor ? (
                    <>
                      <p className="text-sm font-bold text-slate-900 leading-tight break-words">{tutor.name}</p>
                      <p className="text-slate-500">{tutor.relationship}</p>
                      <p className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Phone className="w-3 h-3" /> {tutor.phone}
                      </p>
                    </>
                  ) : (
                    <p className="italic text-slate-400">Sin tutor registrado</p>
                  )}
                  <p className="pt-1 text-[9px] text-slate-400">Escanea el QR para abrir el pase digital.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 pb-3 print:hidden">
                <a
                  href={`/padre/${student.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Probar enlace
                </a>
                <button
                  onClick={() => printOne(student.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-[11px] font-bold text-white transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-500 py-16 print:hidden">
            No hay alumnos que coincidan con los filtros.
          </p>
        )}
      </section>
    </main>
  );
}
