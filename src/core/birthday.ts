export interface BirthdayInfo {
  /** Días hasta el próximo cumpleaños (0 = hoy). */
  daysUntil: number;
  isToday: boolean;
  /** true si es hoy o faltan 7 días o menos. */
  isSoon: boolean;
}

/**
 * Calcula los días restantes para el próximo cumpleaños comparando solo mes y día.
 * Maneja el 29 de febrero usando el 28 de febrero en años no bisiestos.
 */
export function getBirthdayInfo(birthDate: string | undefined, today: Date = new Date()): BirthdayInfo | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const nextOccurrence = (year: number) => {
    let d = new Date(year, month, day);
    if (d.getMonth() !== month) d = new Date(year, month, day - 1); // 29-feb en año no bisiesto
    return d;
  };

  let next = nextOccurrence(startOfToday.getFullYear());
  if (next < startOfToday) next = nextOccurrence(startOfToday.getFullYear() + 1);

  const daysUntil = Math.round((next.getTime() - startOfToday.getTime()) / 86_400_000);
  return { daysUntil, isToday: daysUntil === 0, isSoon: daysUntil <= 7 };
}
