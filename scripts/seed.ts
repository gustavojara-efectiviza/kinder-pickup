import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";

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

const salas = ["BEBES", "MATERNAL", "PREESCOLAR"] as const;

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
    "Milagros Medina", "Ian Barrios", "Bianca Mendoza", "Álvaro Cáceres", "Abigail Méndez"
];

async function seed() {
    console.log("Conectando con Firestore en el proyecto:", firebaseConfig.projectId);
    const batch = writeBatch(db);
    const studentsCol = collection(db, "students");

    nombres.forEach((nombre, index) => {
        const studentRef = doc(studentsCol, `student-${index + 1}`);
        const sala = salas[index % salas.length];

        // Dejamos estados variados para ver colores de inmediato en el panel
        const initialStatus = index < 30 ? "PRESENT" : index < 42 ? "ON_THE_WAY" : "ABSENT";

        batch.set(studentRef, {
            id: `student-${index + 1}`,
            name: nombre,
            photoUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(nombre)}`,
            room: sala,
            status: initialStatus,
            lastStatusUpdate: Date.now(),
            allergies: index % 6 === 0 ? "Sin gluten / Alergia a nueces" : "",
            currentTutor: initialStatus === "ON_THE_WAY" ? {
                id: `tutor-${index + 1}`,
                name: "Tutor de " + nombre.split(" ")[0],
                relationship: index % 2 === 0 ? "MAMÁ" : "PAPÁ",
                phone: "+595981000000"
            } : null
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