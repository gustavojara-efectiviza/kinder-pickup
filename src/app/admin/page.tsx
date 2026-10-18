"use client";

import React, { useMemo, useState } from "react";
import { collection, deleteDoc, deleteField, doc, setDoc, updateDoc } from "firebase/firestore";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  HeartPulse,
  Clock,
  Users,
  X,
  RotateCcw,
  Tv,
  RefreshCw,
  Save,
} from "lucide-react";
import { db } from "@/config/firebase";
import { usePickupRealtime } from "@/core/use-pickup-realtime";
import PinAuthGuard from "@/components/PinAuthGuard";
import type {
  MedicalInfo,
  PickupStatus,
  RoomId,
  ScheduleContract,
  ShiftType,
  Student,
  TutorInfo,
} from "@/types/pickup";

const ROOMS: { id: RoomId; label: string }[] = [
  { id: "SALITA_1", label: "Salita 1 (Bebés)" },
  { id: "SALITA_2", label: "Salita 2" },
  { id: "SALITA_3", label: "Salita 3" },
  { id: "JARDIN", label: "Jardín" },
  { id: "PREESCOLAR", label: "Preescolar" },
];

const SHIFTS: { id: ShiftType; label: string; entry: string; exit: string }[] = [
  { id: "MANANA", label: "Mañana", entry: "07:00", exit: "11:00" },
  { id: "TARDE", label: "Tarde", entry: "13:00", exit: "17:00" },
  { id: "DOBLE_TURNO", label: "Doble Turno", entry: "07:00", exit: "17:00" },
];

const BLOOD_TYPES: NonNullable<MedicalInfo["bloodType"]>[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONSHIPS = ["Mamá", "Papá", "Abuelo/a", "Transporte"];

const STATUS_LABEL: Record<PickupStatus, string> = {
  ABSENT: "Ausente",
  PRESENT: "En Sala",
  ON_THE_WAY: "En Camino",
  ARRIVED: "En Puerta",
  DISMISSED: "Retirado",
};

const STATUS_STYLE: Record<PickupStatus, string> = {
  ABSENT: "bg-slate-700 text-slate-300",
  PRESENT: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  ON_THE_WAY: "bg-amber-400/20 text-amber-300 border border-amber-400/40",
  ARRIVED: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
  DISMISSED: "bg-zinc-600/40 text-zinc-300",
};

interface FormState {
  name: string;
  photoUrl: string;
  birthDate: string;
  room: RoomId | "";
  shift: ShiftType | "";
  entryTime: string;
  exitTime: string;
  bloodType: string;
  allergies: string;
  medication: string;
  specialDiet: string;
  tutorName: string;
  tutorRelationship: string;
  tutorPhone: string;
  authorized: AuthorizedRow[];
}

interface AuthorizedRow {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

const ROLE_SUGGESTIONS = ["Mamá", "Papá", "Abuelo/a", "Tío/a", "Hermano/a mayor", "Niñera", "Chofer", "Transporte escolar", "Vecino/a", "Otro"];

let rowCounter = 0;
const newRowId = () => `auth-${Date.now()}-${rowCounter++}`;
const emptyAuthorizedRow = (): AuthorizedRow => ({ id: newRowId(), name: "", relationship: "", phone: "" });

const EMPTY_FORM: FormState = {
  name: "",
  photoUrl: "",
  birthDate: "",
  room: "",
  shift: "",
  entryTime: "",
  exitTime: "",
  bloodType: "",
  allergies: "",
  medication: "",
  specialDiet: "",
  tutorName: "",
  tutorRelationship: RELATIONSHIPS[0],
  tutorPhone: "",
  authorized: [],
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function avatarFor(name: string) {
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(name || "nuevo")}`;
}

function formFromStudent(s: Student): FormState {
  return {
    name: s.name,
    photoUrl: s.photoUrl ?? "",
    birthDate: s.birthDate ?? "",
    room: s.room,
    shift: s.schedule?.shift ?? "",
    entryTime: s.schedule?.entryTime ?? "",
    exitTime: s.schedule?.exitTime ?? "",
    bloodType: s.medical?.bloodType ?? "",
    allergies: s.medical?.allergies ?? s.allergies ?? "",
    medication: s.medical?.medication ?? "",
    specialDiet: s.medical?.specialDiet ?? "",
    tutorName: s.primaryTutor?.name ?? "",
    tutorRelationship: s.primaryTutor?.relationship ?? RELATIONSHIPS[0],
    tutorPhone: s.primaryTutor?.phone ?? "",
    authorized: (s.authorizedPersons ?? []).map((p) => ({
      id: p.id || newRowId(),
      name: p.name,
      relationship: p.relationship,
      phone: p.phone,
    })),
  };
}

const inputClass =
  "w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40";
const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1";

export default function AdminPage() {
  return (
    <PinAuthGuard>
      <AdminContent />
    </PinAuthGuard>
  );
}

function AdminContent() {
  const { students, loading, resetDailyStatuses } = usePickupRealtime();

  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<RoomId | "ALL">("ALL");
  const [shiftFilter, setShiftFilter] = useState<ShiftType | "ALL">("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return students.filter((s) => {
      if (q && !normalize(s.name).includes(q)) return false;
      if (roomFilter !== "ALL" && s.room !== roomFilter) return false;
      if (shiftFilter !== "ALL" && s.schedule?.shift !== shiftFilter) return false;
      return true;
    });
  }, [students, search, roomFilter, shiftFilter]);

  const flash = (type: "ok" | "error", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setDrawerOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingId(student.id);
    setForm(formFromStudent(student));
    setFormErrors([]);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleShiftChange = (value: ShiftType | "") => {
    const preset = SHIFTS.find((s) => s.id === value);
    setForm((prev) => ({
      ...prev,
      shift: value,
      entryTime: preset ? preset.entry : prev.entryTime,
      exitTime: preset ? preset.exit : prev.exitTime,
    }));
  };

  const addAuthorized = () => setForm((prev) => ({ ...prev, authorized: [...prev.authorized, emptyAuthorizedRow()] }));

  const updateAuthorized = (rowId: string, field: "name" | "relationship" | "phone", value: string) =>
    setForm((prev) => ({
      ...prev,
      authorized: prev.authorized.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    }));

  const removeAuthorized = (rowId: string) =>
    setForm((prev) => ({ ...prev, authorized: prev.authorized.filter((r) => r.id !== rowId) }));

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("El nombre es obligatorio.");
    if (!form.room) errors.push("Selecciona una sala.");
    if (!form.shift) errors.push("Selecciona un turno.");
    if (!form.exitTime) errors.push("La hora de salida es obligatoria.");
    if (form.entryTime && form.exitTime && form.entryTime >= form.exitTime) {
      errors.push("La hora de salida debe ser posterior a la de entrada.");
    }
    if (form.tutorName.trim() && !form.tutorPhone.trim()) {
      errors.push("Indica el teléfono del tutor.");
    }
    form.authorized.forEach((r, i) => {
      const touched = r.name.trim() || r.relationship.trim() || r.phone.trim();
      if (!touched) return; // filas vacías se ignoran
      if (!r.name.trim()) errors.push(`Autorizado ${i + 1}: falta el nombre.`);
      if (!r.relationship.trim()) errors.push(`Autorizado ${i + 1}: falta el rol.`);
      if (!r.phone.trim()) errors.push(`Autorizado ${i + 1}: falta el número de contacto.`);
    });
    return errors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const existing = editingId ? students.find((s) => s.id === editingId) : undefined;
      const studentsCol = collection(db, "students");
      const id = editingId ?? doc(studentsCol).id;
      const name = form.name.trim();

      const schedule: ScheduleContract = {
        shift: form.shift as ShiftType,
        entryTime: form.entryTime || SHIFTS.find((s) => s.id === form.shift)?.entry || "07:00",
        exitTime: form.exitTime,
      };

      const medical: MedicalInfo = {};
      if (form.bloodType) medical.bloodType = form.bloodType as MedicalInfo["bloodType"];
      if (form.allergies.trim()) medical.allergies = form.allergies.trim();
      if (form.medication.trim()) medical.medication = form.medication.trim();
      if (form.specialDiet.trim()) medical.specialDiet = form.specialDiet.trim();

      const data: Record<string, unknown> = {
        id,
        name,
        photoUrl: form.photoUrl.trim() || avatarFor(name),
        room: form.room as RoomId,
        schedule,
        medical,
        allergies: medical.allergies ?? "",
        status: existing?.status ?? "PRESENT",
        currentTutor: existing?.currentTutor ?? null,
        lastStatusUpdate: existing?.lastStatusUpdate ?? Date.now(),
        updatedAt: Date.now(),
      };
      if (form.birthDate) data.birthDate = form.birthDate;
      if (existing?.distanceMeters !== undefined) data.distanceMeters = existing.distanceMeters;
      if (existing?.etaMinutes !== undefined) data.etaMinutes = existing.etaMinutes;
      if (form.tutorName.trim()) {
        const primaryTutor: TutorInfo = {
          id: existing?.primaryTutor?.id ?? `tutor-${id}`,
          name: form.tutorName.trim(),
          relationship: form.tutorRelationship,
          phone: form.tutorPhone.trim(),
        };
        data.primaryTutor = primaryTutor;
      }
      const authorizedPersons: TutorInfo[] = form.authorized
        .filter((r) => r.name.trim())
        .map((r) => ({
          id: r.id,
          name: r.name.trim(),
          relationship: r.relationship.trim(),
          phone: r.phone.trim(),
        }));
      if (authorizedPersons.length > 0) data.authorizedPersons = authorizedPersons;

      // Reemplazo completo del documento (sin merge) para que los campos vaciados se eliminen
      await setDoc(doc(db, "students", id), data);
      setDrawerOpen(false);
      flash("ok", editingId ? `Alumno "${name}" actualizado.` : `Alumno "${name}" creado.`);
    } catch (err) {
      console.error(err);
      setFormErrors([`No se pudo guardar: ${err instanceof Error ? err.message : "error desconocido"}`]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`¿Eliminar a "${student.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, "students", student.id));
      flash("ok", `Alumno "${student.name}" eliminado.`);
    } catch (err) {
      console.error(err);
      flash("error", "No se pudo eliminar el alumno.");
    }
  };

  const handleForceStatus = async (student: Student, status: "PRESENT" | "ABSENT") => {
    try {
      await updateDoc(doc(db, "students", student.id), {
        status,
        currentTutor: null,
        distanceMeters: deleteField(),
        etaMinutes: deleteField(),
        lastStatusUpdate: Date.now(),
      });
    } catch (err) {
      console.error(err);
      flash("error", "No se pudo cambiar el estado.");
    }
  };

  const handleResetDay = async () => {
    if (!window.confirm("¿Resetear el día? Todos los alumnos volverán a 'En Sala' y se borrarán los tutores en camino.")) return;
    try {
      await resetDailyStatuses();
      flash("ok", "Jornada reiniciada: todos los alumnos están en sala.");
    } catch {
      flash("error", "No se pudo resetear el día.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mr-3 text-amber-400" />
        <span className="text-xl">Cargando alumnos...</span>
      </div>
    );
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
      active ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
    }`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20 text-amber-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administración de Alumnos</h1>
            <p className="text-xs text-slate-400">
              Dirección / Secretaría · {filtered.length} de {students.length} alumnos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Tv className="w-4 h-4" /> Abrir TV <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
          <button
            onClick={handleResetDay}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Resetear Día
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors shadow-lg shadow-amber-400/10"
          >
            <Plus className="w-4 h-4" /> Nuevo Alumno
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-medium border ${
            notice.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Buscador y filtros */}
      <section className="mt-5 space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno por nombre..."
            className={`${inputClass} pl-9`}
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
              Todos los turnos
            </button>
            {SHIFTS.map((s) => (
              <button key={s.id} onClick={() => setShiftFilter(s.id)} className={filterBtn(shiftFilter === s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Listado */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
        {filtered.map((student) => {
          const medical = student.medical;
          const hasMedical = !!(medical?.allergies || medical?.medication || medical?.specialDiet || student.allergies);
          return (
            <article key={student.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-100 truncate">{student.name}</h2>
                  <p className="text-[11px] text-slate-400">
                    {ROOMS.find((r) => r.id === student.room)?.label ?? student.room}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${STATUS_STYLE[student.status]}`}>
                  {STATUS_LABEL[student.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {student.schedule && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    <Clock className="w-3 h-3" />
                    {SHIFTS.find((s) => s.id === student.schedule.shift)?.label} · {student.schedule.entryTime}–{student.schedule.exitTime}
                  </span>
                )}
                {hasMedical && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    <HeartPulse className="w-3 h-3" />
                    {[medical?.allergies || student.allergies, medical?.medication, medical?.specialDiet]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {medical?.bloodType && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{medical.bloodType}</span>
                )}
              </div>

              {student.primaryTutor && (
                <p className="text-[11px] text-slate-400 truncate">
                  Tutor: <span className="text-slate-200">{student.primaryTutor.name}</span> ({student.primaryTutor.relationship}) ·{" "}
                  {student.primaryTutor.phone}
                </p>
              )}
              {student.authorizedPersons && student.authorizedPersons.length > 0 && (
                <p className="text-[11px] text-slate-400 truncate" title={student.authorizedPersons.map((p) => `${p.name} (${p.relationship}) ${p.phone}`).join("\n")}>
                  Autorizados:{" "}
                  <span className="text-slate-200">
                    {student.authorizedPersons.map((p) => `${p.name} (${p.relationship})`).join(", ")}
                  </span>
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-800">
                <button
                  onClick={() => openEdit(student)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <a
                  href={`/padre/${student.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir Pase Digital"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleForceStatus(student, "PRESENT")}
                  title="Forzar En Sala"
                  className="px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-bold text-emerald-300 transition-colors"
                >
                  En Sala
                </button>
                <button
                  onClick={() => handleForceStatus(student, "ABSENT")}
                  title="Forzar Ausente"
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors"
                >
                  Ausente
                </button>
                <button
                  onClick={() => handleDelete(student)}
                  title="Eliminar alumno"
                  className="ml-auto p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-500 py-16">
            No hay alumnos que coincidan con los filtros.
          </p>
        )}
      </section>

      {/* Drawer de alta / edición */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold">{editingId ? "Editar alumno" : "Nuevo alumno"}</h2>
              <button type="button" onClick={closeDrawer} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {formErrors.length > 0 && (
                <ul className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-300 list-disc list-inside space-y-0.5">
                  {formErrors.map((er) => (
                    <li key={er}>{er}</li>
                  ))}
                </ul>
              )}

              <fieldset className="space-y-3">
                <legend className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Datos personales</legend>
                <div>
                  <label className={labelClass} htmlFor="f-name">Nombre y apellidos *</label>
                  <input id="f-name" className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="f-birth">Fecha de nacimiento</label>
                    <input id="f-birth" type="date" className={inputClass} value={form.birthDate} onChange={(e) => setField("birthDate", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="f-photo">Foto URL (opcional)</label>
                    <input id="f-photo" className={inputClass} placeholder="https://..." value={form.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Ubicación y horarios</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="f-room">Sala *</label>
                    <select id="f-room" className={inputClass} value={form.room} onChange={(e) => setField("room", e.target.value as RoomId | "")}>
                      <option value="">Seleccionar...</option>
                      {ROOMS.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="f-shift">Turno *</label>
                    <select id="f-shift" className={inputClass} value={form.shift} onChange={(e) => handleShiftChange(e.target.value as ShiftType | "")}>
                      <option value="">Seleccionar...</option>
                      {SHIFTS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="f-entry">Hora de entrada</label>
                    <input id="f-entry" type="time" className={inputClass} value={form.entryTime} onChange={(e) => setField("entryTime", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="f-exit">Hora de salida *</label>
                    <input id="f-exit" type="time" className={inputClass} value={form.exitTime} onChange={(e) => setField("exitTime", e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Ficha médica</legend>
                <div>
                  <label className={labelClass} htmlFor="f-blood">Tipo de sangre</label>
                  <select id="f-blood" className={inputClass} value={form.bloodType} onChange={(e) => setField("bloodType", e.target.value)}>
                    <option value="">Sin especificar</option>
                    {BLOOD_TYPES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="f-allergies">Alergias</label>
                  <input id="f-allergies" className={inputClass} value={form.allergies} onChange={(e) => setField("allergies", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="f-med">Medicación especial</label>
                  <input id="f-med" className={inputClass} value={form.medication} onChange={(e) => setField("medication", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="f-diet">Dieta especial</label>
                  <input id="f-diet" className={inputClass} value={form.specialDiet} onChange={(e) => setField("specialDiet", e.target.value)} />
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Tutor principal</legend>
                <div>
                  <label className={labelClass} htmlFor="f-tname">Nombre</label>
                  <input id="f-tname" className={inputClass} value={form.tutorName} onChange={(e) => setField("tutorName", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="f-trel">Parentesco</label>
                    <select id="f-trel" className={inputClass} value={form.tutorRelationship} onChange={(e) => setField("tutorRelationship", e.target.value)}>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="f-tphone">Teléfono</label>
                    <input id="f-tphone" type="tel" className={inputClass} placeholder="+595..." value={form.tutorPhone} onChange={(e) => setField("tutorPhone", e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Otras personas autorizadas</legend>
                <datalist id="role-suggestions">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>

                {form.authorized.length === 0 && (
                  <p className="text-xs text-slate-500">No hay otras personas autorizadas a retirar al alumno.</p>
                )}

                {form.authorized.map((row, i) => (
                  <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">Autorizado {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAuthorized(row.id)}
                        title="Quitar autorizado"
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`a-name-${row.id}`}>Nombre</label>
                      <input id={`a-name-${row.id}`} className={inputClass} value={row.name} onChange={(e) => updateAuthorized(row.id, "name", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass} htmlFor={`a-rol-${row.id}`}>Rol</label>
                        <input
                          id={`a-rol-${row.id}`}
                          list="role-suggestions"
                          className={inputClass}
                          placeholder="Ej. Tío, Niñera..."
                          value={row.relationship}
                          onChange={(e) => updateAuthorized(row.id, "relationship", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`a-tel-${row.id}`}>Número de contacto</label>
                        <input id={`a-tel-${row.id}`} type="tel" className={inputClass} placeholder="+595..." value={row.phone} onChange={(e) => updateAuthorized(row.id, "phone", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAuthorized}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-600 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar autorizado
                </button>
              </fieldset>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
              <button type="button" onClick={closeDrawer} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-black disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
