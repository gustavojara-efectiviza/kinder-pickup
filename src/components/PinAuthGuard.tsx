"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Lock, ShieldCheck, Delete, LogOut } from "lucide-react";

const STORAGE_KEY = "kinder_admin_auth";
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "2026";

// Pequeño store para reaccionar a cambios en sessionStorage dentro de la misma pestaña
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const notify = () => listeners.forEach((cb) => cb());

type AuthSnapshot = "loading" | "yes" | "no";
const getSnapshot = (): AuthSnapshot => (sessionStorage.getItem(STORAGE_KEY) === "true" ? "yes" : "no");
const getServerSnapshot = (): AuthSnapshot => "loading";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function PinAuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const submit = useCallback((candidate: string) => {
    if (candidate === ADMIN_PIN) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setError(false);
      setValue("");
      notify();
    } else {
      setError(true);
      clearTimer.current = setTimeout(() => {
        setValue("");
        setError(false);
      }, 700);
    }
  }, []);

  const pressDigit = useCallback(
    (digit: string) => {
      if (error || value.length >= ADMIN_PIN.length) return;
      const next = value + digit;
      setValue(next);
      if (next.length === ADMIN_PIN.length) submit(next);
    },
    [error, value, submit]
  );

  const backspace = useCallback(() => {
    if (error) return;
    setValue((v) => v.slice(0, -1));
  }, [error]);

  const clearAll = useCallback(() => {
    if (error) return;
    setValue("");
  }, [error]);

  // Entrada directa por teclado físico (solo mientras la pantalla está bloqueada)
  useEffect(() => {
    if (auth !== "no") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape" || e.key === "Delete") clearAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [auth, pressDigit, backspace, clearAll]);

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setValue("");
    setError(false);
    notify();
  };

  if (auth === "loading") {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (auth === "yes") {
    return <>{children}</>;
  }

  const padBtn =
    "h-16 rounded-2xl bg-slate-900 border border-slate-800 text-2xl font-bold text-slate-100 hover:bg-slate-800 hover:border-blue-400/50 active:scale-95 transition-all select-none";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(9px); }
          45% { transform: translateX(-7px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
        }
        .pin-shake { animation: pin-shake 0.5s ease-in-out; }
      `}</style>

      <div className="w-full max-w-xs text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Pequeños Héroes"
          className="mx-auto mb-4 h-20 w-auto object-contain rounded-xl bg-white/95 p-1.5 border border-sky-400/30 shadow-lg"
        />
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
          {error ? <Lock className="w-6 h-6 text-rose-400" /> : <ShieldCheck className="w-6 h-6 text-blue-400" />}
        </div>
        <h1 className="text-xl font-black tracking-tight text-white">Acceso Restringido</h1>
        <p className="text-xs text-slate-400 mt-0.5">Espacio de Desarrollo Infantil · N° 8161</p>

        <div className={`flex justify-center gap-4 mt-7 mb-2 ${error ? "pin-shake" : ""}`} aria-label="Dígitos ingresados">
          {Array.from({ length: ADMIN_PIN.length }).map((_, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                error
                  ? "bg-rose-500 border-rose-500"
                  : i < value.length
                    ? "bg-amber-400 border-amber-400"
                    : "border-slate-600"
              }`}
            />
          ))}
        </div>

        <p role="alert" className={`h-5 text-xs font-semibold text-rose-400 ${error ? "opacity-100" : "opacity-0"}`}>
          PIN incorrecto. Intente nuevamente
        </p>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => pressDigit(k)} className={padBtn}>
              {k}
            </button>
          ))}
          <button type="button" onClick={clearAll} className={`${padBtn} !text-xs !font-bold uppercase tracking-wider text-slate-400`}>
            Limpiar
          </button>
          <button type="button" onClick={() => pressDigit("0")} className={padBtn}>
            0
          </button>
          <button type="button" onClick={backspace} title="Borrar" className={`${padBtn} flex items-center justify-center`}>
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </main>
  );
}
