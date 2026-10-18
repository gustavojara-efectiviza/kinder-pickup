import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs } from "firebase/firestore";
import type { RoomId, ShiftType, PickupStatus, MedicalInfo, TutorInfo } from "../src/types/pickup";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const salas: RoomId[] = ["SALITA_1", "SALITA_2", "SALITA_3", "JARDIN", "PREESCOLAR"];

const nombres = [
    "Mateo Jara", "Sofía Benítez", "Lucas Cardozo", "Valeria Duarte", "Santino Vera",
    "Mia Ferreira", "Thiago Giménez", "Emilia Ayala", "Facundo López", "Victoria González",
    "Bruno Rojas", "Renata Acosta", "Joaquín Caballero", "Camila Romero", "Felipe Gamarra",
    "Martina Insfrán", "Gael Silvero", "Isabella Franco", "Benjamín Samaniego", "Catalina Florentín",
    "Samuel Núñez", "Julieta Valdez", "Liam Ortiz", "Luciana Galeano", "Dylan Bogado",
    "Zoe Cano", "Maximiliano Morales", "Elena Portillo", "Gabriel Coronel", "Alana Bareiro",
    "Dante Salinas", "Constanza Morínigo", "Nicolás Sosa", "Emma Alvarenga", "Bautista Fleitas",
    "Alma Cristaldo", "Sebastián Benítez", "Guadalupe Servín", "Alejo Osorio", "Paula Quintana",
    "Ignacio Garay", "Florencia Prieto", "Iván Godoy", "Amalia Rolón", "Oliver Rivas",
    "Milagros Medina", "Ian Barrios", "Bianca Mendoza", "Álvaro Cáceres", "Abigail Méndez",
];

const bloodTypes: NonNullable<MedicalInfo["bloodType"]>[] = ["O+", "A+", "B+"];
const alergias = ["Maní", "Proteína de leche de vaca", "Picadura de abeja"];
const dietas = ["Sin gluten (Celiaquía)", "Vegetariana", "Sin lactosa"];
const medicaciones = ["Antihistamínico SOS", "Nebulización preventiva 10:00"];

// Turnos: 25 mañana, 20 tarde, 5 doble turno. Sala rota por bloque de 10 => 10 alumnos por sala.
function shiftFor(index: number): ShiftType {
    const m = index % 10;
    if (m < 5) return "MANANA";
    if (m < 9) return "TARDE";
    return "DOBLE_TURNO";
}

function statusFor(index: number): PickupStatus {
    if (index % 7 === 0) return "ON_THE_WAY";
    if (index % 13 === 5) return "ARRIVED";
    if (index % 7 === 6) return "ABSENT";
    return "PRESENT";
}

// 3 alumnos de mañana con horario extendido hasta las 12:00
const EXTENDED_MORNING = new Set([1, 11, 21]);

function scheduleFor(index: number) {
    const shift = shiftFor(index);
    if (shift === "MANANA") {
        return { shift, entryTime: "07:00", exitTime: EXTENDED_MORNING.has(index) ? "12:00" : "11:00" };
    }
    if (shift === "TARDE") return { shift, entryTime: "13:00", exitTime: "17:00" };
    return { shift, entryTime: "07:00", exitTime: "17:00" };
}

function medicalFor(index: number): MedicalInfo {
    const medical: MedicalInfo = { bloodType: bloodTypes[index % bloodTypes.length] };
    if (index % 6 === 0) medical.allergies = alergias[(index / 6) % alergias.length | 0];
    if (index % 8 === 3) medical.specialDiet = dietas[((index - 3) / 8) % dietas.length | 0];
    if (index % 9 === 4) medical.medication = medicaciones[((index - 4) / 9) % medicaciones.length | 0];
    return medical;
}

async function seed() {
    console.log("Conectando con Firestore en el proyecto:", firebaseConfig.projectId);
    const studentsCol = collection(db, "students");
    const batch = writeBatch(db);

    // Limpieza: borra cualquier documento previo de la colección
    const existing = await getDocs(studentsCol);
    existing.forEach((d) => batch.delete(d.ref));
    console.log(`Eliminando ${existing.size} documentos previos...`);

    nombres.forEach((nombre, index) => {
        const id = `student-${index + 1}`;
        const studentRef = doc(studentsCol, id);
        const room = salas[(index + Math.floor(index / 10)) % salas.length];
        const status = statusFor(index);
        const medical = medicalFor(index);

        let currentTutor: TutorInfo | null = null;
        let distanceMeters: number | undefined;
        let etaMinutes: number | undefined;
        if (status === "ON_THE_WAY" || status === "ARRIVED") {
            currentTutor = {
                id: `tutor-${index + 1}`,
                name: "Tutor de " + nombre.split(" ")[0],
                relationship: index % 2 === 0 ? "MAMÁ" : "PAPÁ",
                phone: "+595981000000",
            };
            if (status === "ON_THE_WAY") {
                distanceMeters = 150 + ((index * 53) % 650);
                etaMinutes = Math.max(1, Math.ceil(distanceMeters / 416));
            } else {
                distanceMeters = 40;
                etaMinutes = 1;
            }
        }

        batch.set(studentRef, {
            id,
            name: nombre,
            photoUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(nombre)}`,
            room,
            status,
            schedule: scheduleFor(index),
            medical,
            allergies: medical.allergies ?? "",
            currentTutor,
            ...(distanceMeters !== undefined && { distanceMeters }),
            ...(etaMinutes !== undefined && { etaMinutes }),
            lastStatusUpdate: Date.now(),
            updatedAt: Date.now(),
        });
    });

    await batch.commit();
    console.log("¡Listo! 50 alumnos creados con éxito en Firestore.");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Error al poblar la base de datos:", err);
    process.exit(1);
});