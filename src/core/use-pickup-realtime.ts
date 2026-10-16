"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { Student, PickupStatus, Tutor } from "@/types/pickup";

export function usePickupRealtime() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const studentsCol = collection(db, "students");

        const unsubscribe = onSnapshot(
            studentsCol,
            (snapshot) => {
                const items: Student[] = [];
                snapshot.forEach((docSnapshot) => {
                    items.push(docSnapshot.data() as Student);
                });
                // Orden alfabético por nombre
                items.sort((a, b) => a.name.localeCompare(b.name));
                setStudents(items);
                setLoading(false);
            },
            (err) => {
                console.error("Firestore error:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const updateStudentStatus = useCallback(
        async (studentId: string, status: PickupStatus, tutor?: Tutor, etaMinutes?: number) => {
            try {
                const studentRef = doc(db, "students", studentId);
                const updateData: Partial<Student> = {
                    status,
                    lastStatusUpdate: Date.now(),
                };

                if (tutor !== undefined) {
                    updateData.currentTutor = tutor;
                }
                if (etaMinutes !== undefined) {
                    updateData.etaMinutes = etaMinutes;
                }

                await updateDoc(studentRef, updateData);
            } catch (err) {
                console.error("Error al actualizar estado:", err);
                throw err;
            }
        },
        []
    );

    const resetDailyStatuses = useCallback(async () => {
        try {
            const studentsCol = collection(db, "students");
            const snapshot = await getDocs(studentsCol);
            const batch = writeBatch(db);

            snapshot.docs.forEach((docSnap) => {
                batch.update(docSnap.ref, {
                    status: "PRESENT",
                    currentTutor: null,
                    lastStatusUpdate: Date.now(),
                });
            });

            await batch.commit();
        } catch (err) {
            console.error("Error al reiniciar estados:", err);
            throw err;
        }
    }, []);

    return {
        students,
        loading,
        error,
        updateStudentStatus,
        resetDailyStatuses,
    };
}