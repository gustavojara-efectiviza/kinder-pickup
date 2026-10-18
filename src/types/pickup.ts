export type PickupStatus = "ABSENT" | "PRESENT" | "ON_THE_WAY" | "ARRIVED" | "DISMISSED";
export type RoomId = "SALITA_1" | "SALITA_2" | "SALITA_3" | "JARDIN" | "PREESCOLAR";
export type ShiftType = "MANANA" | "TARDE" | "DOBLE_TURNO";

export interface TutorInfo {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    photoUrl?: string;
}

// Alias de compatibilidad con código existente
export type Tutor = TutorInfo;

export interface MedicalInfo {
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
    allergies?: string;
    medication?: string;
    specialDiet?: string;
}

export interface ScheduleContract {
    entryTime: string; // Ej: "07:00" o "13:00"
    exitTime: string; // Ej: "11:00", "12:00" (extendido) o "17:00"
    shift: ShiftType;
}

export interface Student {
    id: string;
    name: string;
    room: RoomId;
    status: PickupStatus;
    photoUrl: string;
    schedule: ScheduleContract;
    medical?: MedicalInfo;
    allergies?: string; // Para compatibilidad hacia atrás
    currentTutor?: TutorInfo | null;
    distanceMeters?: number;
    etaMinutes?: number;
    updatedAt?: number;
    lastStatusUpdate?: number;
}