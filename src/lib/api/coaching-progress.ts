/**
 * coaching-progress.ts — Funciones de progreso avanzado para alumnos del coach.
 *
 * Portado desde mobile/lib/api/coaching-progress.ts.
 * Diferencia clave: sin `accessToken` como parámetro — httpFetch lo lee desde localStorage.
 */

import { httpFetch } from "./http";
import type {
  ProgressRange,
  OneRMExerciseOption,
  OneRMProgressionPoint,
  ConsistencyHeatmapDay,
  MuscleDistributionEntry,
  PlanningAdherenceWeek,
} from "./types";

// ─── Response types ───────────────────────────────────────────────────────────

export interface OneRMExercisesResponse {
  exercises: OneRMExerciseOption[];
}

export interface OneRMProgressionResponse {
  progression: OneRMProgressionPoint[];
  exercise: OneRMExerciseOption;
}

export interface ConsistencyHeatmapResponse {
  days: ConsistencyHeatmapDay[];
  period: { start: string; end: string };
}

export interface MuscleDistributionResponse {
  distribution: MuscleDistributionEntry[];
}

export interface PlanningAdherenceResponse {
  weeks: PlanningAdherenceWeek[];
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Obtiene los ejercicios disponibles para el gráfico de 1RM de un alumno.
 * GET /coaching/students/:studentId/progress/one-rm/exercises?range=
 */
export async function getCoachStudentOneRMExercises(
  studentId: number,
  range: ProgressRange
): Promise<OneRMExercisesResponse> {
  return httpFetch<OneRMExercisesResponse>(
    `/coaching/students/${studentId}/progress/one-rm/exercises?range=${range}`
  );
}

/**
 * Obtiene la progresión de 1RM de un ejercicio específico de un alumno.
 * GET /coaching/students/:studentId/progress/one-rm?exercise_id=&range=
 */
export async function getCoachStudentOneRMProgression(
  studentId: number,
  exerciseId: number,
  range: ProgressRange
): Promise<OneRMProgressionResponse> {
  const params = new URLSearchParams({
    exercise_id: String(exerciseId),
    range,
  });
  return httpFetch<OneRMProgressionResponse>(
    `/coaching/students/${studentId}/progress/one-rm?${params.toString()}`
  );
}

/**
 * Obtiene el heatmap de consistencia de entrenamiento de un alumno.
 * GET /coaching/students/:studentId/progress/consistency-heatmap?range=
 */
export async function getCoachStudentConsistencyHeatmap(
  studentId: number,
  range: ProgressRange
): Promise<ConsistencyHeatmapResponse> {
  return httpFetch<ConsistencyHeatmapResponse>(
    `/coaching/students/${studentId}/progress/consistency-heatmap?range=${range}`
  );
}

/**
 * Obtiene la distribución muscular de los entrenamientos de un alumno.
 * GET /coaching/students/:studentId/progress/muscle-distribution?range=
 */
export async function getCoachStudentMuscleDistribution(
  studentId: number,
  range: ProgressRange
): Promise<MuscleDistributionResponse> {
  return httpFetch<MuscleDistributionResponse>(
    `/coaching/students/${studentId}/progress/muscle-distribution?range=${range}`
  );
}

/**
 * Obtiene la adherencia semanal al planning de un alumno.
 * GET /coaching/students/:studentId/progress/planning-adherence?range=
 */
export async function getCoachStudentPlanningAdherence(
  studentId: number,
  range: ProgressRange
): Promise<PlanningAdherenceResponse> {
  return httpFetch<PlanningAdherenceResponse>(
    `/coaching/students/${studentId}/progress/planning-adherence?range=${range}`
  );
}
