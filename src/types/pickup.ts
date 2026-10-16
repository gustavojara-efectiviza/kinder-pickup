export type PickupStatus = "ABSENT" | "PRESENT" | "ON_THE_WAY" | "ARRIVED" | "DISMISSED";

export type RoomId = "BEBES" | "MATERNAL" | "PREESCOLAR";

export interface Tutor {
    id: string;
    name: string;
    relationship: "MAMÁ" | "PAPÁ" | "ABUELO" | "OTRO";
    phone: string;
    photoUrl?: string;
}

export interface Student {
    id: string;
    name: string;
    photoUrl: string;
    room: RoomId;
    status: PickupStatus;
    currentTutor?: Tutor | null;
    lastStatusUpdate: number;
    etaMinutes?: number;
    allergies?: string;
}