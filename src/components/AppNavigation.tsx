"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Tv, Users, QrCode, Clock, LogOut, Maximize2, Minimize2 } from "lucide-react";

interface AppNavigationProps {
  current?: "tv" | "admin" | "qr";
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export default function AppNavigation({
  current,
  onToggleFullscreen,
  isFullscreen,
}: AppNavigationProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kinder_admin_auth");
      window.location.reload();
    }
  };

  const navItems = [
    {
      id: "tv" as const,
      label: "Monitor Central",
      href: "/tv",
      icon: Tv,
    },
    {
      id: "admin" as const,
      label: "Gestión Alumnos",
      href: "/admin",
      icon: Users,
    },
    {
      id: "qr" as const,
      label: "Credenciales QR",
      href: "/qr",
      icon: QrCode,
    },
  ];

  return (
    <nav className="print:hidden sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Lado Izquierdo: Logotipo institucional y Nombre */}
          <Link href="/tv" className="flex items-center gap-3 group select-none flex-shrink-0">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Pequeños Héroes"
                className="h-10 w-auto object-contain rounded-lg bg-white/90 p-0.5 border border-sky-400/30 shadow-md transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white group-hover:text-sky-300 transition-colors">
                  PEQUEÑOS HÉROES
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  En Línea
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide">
                Espacio de Desarrollo Infantil N° 8161
              </span>
            </div>
          </Link>

          {/* Centro: Pestañas de Navegación */}
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = current === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Lado Derecho: Reloj en vivo y Acciones */}
          <div className="flex items-center gap-2.5">
            {/* Reloj digital en vivo */}
            {time && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>{time}</span>
              </div>
            )}

            {/* Toggle Pantalla Completa / Ocultar Barra (disponible en /tv) */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Mostrar barra de navegación" : "Modo TV Pantalla Completa"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden lg:inline">Salir Pantalla Completa</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden lg:inline">Pantalla Completa</span>
                  </>
                )}
              </button>
            )}

            {/* Botón de Cerrar Sesión PIN */}
            <button
              onClick={handleLogout}
              title="Bloquear y cerrar sesión de administración"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Pestañas móviles secundarias */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
