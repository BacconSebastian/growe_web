/**
 * plannings.ts — API de planificaciones propias del coach.
 */

import { httpFetch } from "./http";
import type {
  Planning,
  PlanningWeek,
  PlanningWeekRoutine,
  PlanningWeekRoutineExercise,
  PlanningShare,
  PlanningShareSummary,
  WeekRoutineDetail,
  ExerciseType,
  PaginationMeta,
} from "./types";

export interface PlanningsListResponse {
  items: Planning[];
  pagination: PaginationMeta;
}

// ─── Week management payloads ─────────────────────────────────────────────────

export interface AddWeekPayload {
  name?: string;
  description?: string;
  /** Si se envía, la semana nueva se inserta DESPUÉS de este week_number */
  after_week_number?: number;
}

export interface UpdateWeekPayload {
  name?: string | null;
  description?: string | null;
}

export interface ReorderWeeksPayload {
  /** Array de planning_week_ids en el nuevo orden deseado */
  week_ids: number[];
}

// ─── Week-routine management payloads ─────────────────────────────────────────

export interface AssignRoutineToWeekPayload {
  routine_id: number;
  order_index?: number;
  day_of_week?: string | null;
}

/**
 * Input de una rutina en el payload transaccional "guardar semana".
 * Cada elemento representa el estado deseado de un pivot PlanningWeekRoutine.
 */
export interface SaveWeekRoutineInput {
  /** PlanningWeekRoutine.id existente; null = rutina NUEVA */
  week_routine_id?: number | null;
  /** Routine.id existente; null = nueva */
  routine_id?: number | null;
  title: string;
  day_of_week?: string | null;
  order_index?: number;
  /** Snapshot de ejercicios generado por buildExercisesPayload */
  exercises: Array<Record<string, unknown>>;
}

export interface SaveWeekRoutineExercisesPayload {
  exercises: Array<{
    exercise_id?: number | null;
    name: string;
    order_index?: number;
    variant_order?: number;
    series: number;
    repetitions: number;
    weight_kg?: number | null;
    rir?: number | null;
    rest_time?: number | null;
    exercise_type?: ExerciseType;
    is_warmup?: boolean;
    sets_data?: Array<Record<string, unknown>> | null;
    variables_config?: object | null;
  }>;
}

/**
 * @deprecated Payload del modelo anterior. Usar SaveWeekRoutineExercisesPayload.
 * Mantenido por compatibilidad con componentes legacy.
 */
export interface SaveWeekExercisesPayload {
  exercises: Array<{
    exercise_id?: number | null;
    name: string;
    order_index?: number;
    variant_order?: number;
    series: number;
    repetitions: number;
    weight_kg?: number | null;
    rir?: number | null;
    rest_time?: number | null;
    exercise_type?: ExerciseType;
    sets_data?: Array<{
      reps?: number;
      weight_kg?: number | null;
      rir?: number | null;
      seconds?: number;
      alias?: string | null;
    }> | null;
  }>;
}

// ─── List / Get ───────────────────────────────────────────────────────────────

export async function listPlannings(params: {
  page?: number;
  status?: string;
  search?: string;
  per_page?: number;
  day_of_week?: string;
}): Promise<PlanningsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.day_of_week) query.set("day_of_week", params.day_of_week);
  const qs = query.toString();
  return httpFetch<PlanningsListResponse>(`/plannings${qs ? `?${qs}` : ""}`);
}

/**
 * Obtiene una planning, opcionalmente filtrada por semana.
 * GET /plannings/:id[?week=N]
 * Con el modelo nuevo, devuelve `weeks[]` hidratados.
 */
export async function getPlanning(
  id: number,
  opts?: { week?: number }
): Promise<Planning> {
  const qs =
    opts?.week != null && Number.isInteger(opts.week) && opts.week >= 1
      ? `?week=${opts.week}`
      : "";
  return httpFetch<Planning>(`/plannings/${id}${qs}`);
}

/**
 * Obtiene el detalle de un pivot planning_week_routine con su snapshot de ejercicios.
 * GET /plannings/week-routines/:wkRtId
 */
export async function getWeekRoutine(wkRtId: number): Promise<WeekRoutineDetail> {
  return httpFetch<WeekRoutineDetail>(`/plannings/week-routines/${wkRtId}`);
}

// ─── Create / Update / Delete ─────────────────────────────────────────────────

export async function createPlanning(payload: Partial<Planning>): Promise<Planning> {
  return httpFetch<Planning>("/plannings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePlanning(
  id: number,
  payload: Partial<Planning>
): Promise<Planning> {
  return httpFetch<Planning>(`/plannings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePlanning(id: number): Promise<void> {
  await httpFetch<unknown>(`/plannings/${id}`, { method: "DELETE" });
}

// ─── Current week ─────────────────────────────────────────────────────────────

/**
 * Establece la semana activa de una planning.
 * PUT /plannings/:id/current-week — body { week_number }
 *
 * REEMPLAZA la función rota `setPlanningWeek` que enviaba `{ week }`.
 * El backend espera `week_number`, no `week`.
 */
export async function setCurrentWeekOverride(
  planningId: number,
  weekNumber: number | null
): Promise<Planning> {
  return httpFetch<Planning>(`/plannings/${planningId}/current-week`, {
    method: "PUT",
    body: JSON.stringify({ week_number: weekNumber }),
  });
}

// ─── Week management ──────────────────────────────────────────────────────────

/**
 * Agrega una nueva semana a la planificación.
 * POST /plannings/:id/weeks
 */
export async function addWeek(
  planningId: number,
  payload: AddWeekPayload = {}
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(`/plannings/${planningId}/weeks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Actualiza nombre/descripción de una semana.
 * PUT /plannings/weeks/:weekId
 */
export async function updateWeek(
  weekId: number,
  payload: UpdateWeekPayload
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(`/plannings/weeks/${weekId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina una semana (CASCADE limpia sus rutinas y ejercicios snapshot).
 * DELETE /plannings/weeks/:weekId
 */
export async function deleteWeek(weekId: number): Promise<void> {
  await httpFetch<null>(`/plannings/weeks/${weekId}`, { method: "DELETE" });
}

/**
 * Reordena las semanas de una planificación pasando los IDs en el nuevo orden.
 * PUT /plannings/:id/weeks/reorder
 */
export async function reorderWeeks(
  planningId: number,
  payload: ReorderWeeksPayload
): Promise<PlanningWeek[]> {
  return httpFetch<PlanningWeek[]>(`/plannings/${planningId}/weeks/reorder`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Week-routine management ──────────────────────────────────────────────────

/**
 * Asigna una rutina a una semana.
 * El backend crea un snapshot de los ejercicios de la rutina al momento de asignar.
 * POST /plannings/weeks/:weekId/routines
 */
export async function assignRoutineToWeek(
  weekId: number,
  payload: AssignRoutineToWeekPayload
): Promise<PlanningWeekRoutine> {
  return httpFetch<PlanningWeekRoutine>(`/plannings/weeks/${weekId}/routines`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Quita una rutina de una semana (elimina la fila del pivot y su snapshot).
 * DELETE /plannings/week-routines/:wkRtId
 */
export async function removeRoutineFromWeek(wkRtId: number): Promise<void> {
  await httpFetch<null>(`/plannings/week-routines/${wkRtId}`, { method: "DELETE" });
}

/**
 * Actualiza los ejercicios del snapshot de una rutina en una semana.
 * PUT /plannings/week-routines/:wkRtId/exercises
 */
export async function updateWeekRoutineExercises(
  wkRtId: number,
  payload: SaveWeekRoutineExercisesPayload
): Promise<PlanningWeekRoutineExercise[]> {
  return httpFetch<PlanningWeekRoutineExercise[]>(
    `/plannings/week-routines/${wkRtId}/exercises`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/**
 * Guarda el estado completo de una semana en una sola llamada transaccional.
 * El backend borra los pivots de la semana que NO vengan en el payload.
 * PUT /plannings/weeks/:weekId/routines
 */
export async function saveWeekRoutines(
  weekId: number,
  routines: SaveWeekRoutineInput[]
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(`/plannings/weeks/${weekId}/routines`, {
    method: "PUT",
    body: JSON.stringify({ routines }),
  });
}

/**
 * Reemplaza el contenido de una semana (targetWeekId) con el de otra semana
 * del mismo planning (sourceWeekId).
 * POST /plannings/weeks/:targetWeekId/copy-from/:sourceWeekId
 */
export async function copyWeekRoutines(
  sourceWeekId: number,
  targetWeekId: number
): Promise<PlanningWeekRoutine[]> {
  return httpFetch<PlanningWeekRoutine[]>(
    `/plannings/weeks/${targetWeekId}/copy-from/${sourceWeekId}`,
    { method: "POST" }
  );
}

// ─── Shares ───────────────────────────────────────────────────────────────────

/**
 * Comparte una planning con un alumno.
 * POST /plannings/:id/shares
 */
export async function sharePlanning(
  planningId: number,
  payload: { shared_with: number; notes?: string; start_date?: string }
): Promise<PlanningShare> {
  return httpFetch<PlanningShare>(`/plannings/${planningId}/shares`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Lista los shares de una planning.
 * GET /plannings/:id/shares
 */
export async function listPlanningShares(
  planningId: number
): Promise<{ items: PlanningShare[]; total: number }> {
  return httpFetch<{ items: PlanningShare[]; total: number }>(
    `/plannings/${planningId}/shares`
  );
}

/**
 * Lista los shares de plannings emitidos por el coach.
 * GET /plannings/shares/by-me
 */
export async function listPlanningSharesByMe(): Promise<PlanningShareSummary[]> {
  return httpFetch<PlanningShareSummary[]>(`/plannings/shares/by-me?per_page=100`);
}

/**
 * Revoca un share de planning.
 * DELETE /plannings/shares/:shareId
 */
export async function revokePlanningShare(
  shareId: number
): Promise<{ id: number; status: string }> {
  return httpFetch<{ id: number; status: string }>(
    `/plannings/shares/${shareId}`,
    { method: "DELETE" }
  );
}

// Legacy endpoints eliminados — los componentes PlanningEditor.tsx / WeekExercisesEditor.tsx
// que los usaban fueron eliminados en la Fase 1 del rework de plannings.
