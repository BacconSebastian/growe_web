/**
 * plannings.ts — API de planificaciones propias del coach.
 */

import { httpFetch } from "./http";
import type { Planning, PlanningWeekExercise, PaginationMeta } from "./types";

export interface PlanningsListResponse {
  items: Planning[];
  pagination: PaginationMeta;
}

export async function listPlannings(params: {
  page?: number;
  status?: string;
  search?: string;
}): Promise<PlanningsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return httpFetch<PlanningsListResponse>(`/plannings${qs ? `?${qs}` : ""}`);
}

export async function getPlanning(id: number): Promise<Planning> {
  return httpFetch<Planning>(`/plannings/${id}`);
}

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

export async function setPlanningWeek(id: number, week: number): Promise<void> {
  await httpFetch<unknown>(`/plannings/${id}/current-week`, {
    method: "PUT",
    body: JSON.stringify({ week }),
  });
}

export async function getPlanningWeekExercises(
  planningId: number,
  week: number,
  routineId: number
): Promise<PlanningWeekExercise[]> {
  return httpFetch<PlanningWeekExercise[]>(
    `/plannings/${planningId}/weeks/${week}/routines/${routineId}/exercises`
  );
}

export async function updatePlanningWeekExercises(
  planningId: number,
  week: number,
  routineId: number,
  payload: unknown
): Promise<PlanningWeekExercise[]> {
  return httpFetch<PlanningWeekExercise[]>(
    `/plannings/${planningId}/weeks/${week}/routines/${routineId}/exercises`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}
