/**
 * routines.ts — API de rutinas propias del coach.
 */

import { httpFetch } from "./http";
import type { Routine, RoutineShare, RoutineShareSummary, PaginationMeta } from "./types";

export interface RoutinesListResponse {
  items: Routine[];
  pagination: PaginationMeta;
}

export async function listRoutines(params: {
  page?: number;
  search?: string;
  status?: string;
  per_page?: number;
  day_of_week?: string;
  muscle_group?: string;
}): Promise<RoutinesListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.day_of_week) query.set("day_of_week", params.day_of_week);
  if (params.muscle_group) query.set("muscle_group", params.muscle_group);
  const qs = query.toString();
  return httpFetch<RoutinesListResponse>(`/routines${qs ? `?${qs}` : ""}`);
}

export async function getRoutine(id: number): Promise<Routine> {
  return httpFetch<Routine>(`/routines/${id}`);
}

export async function createRoutine(payload: Partial<Routine>): Promise<Routine> {
  return httpFetch<Routine>("/routines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRoutine(
  id: number,
  payload: Partial<Routine>
): Promise<Routine> {
  return httpFetch<Routine>(`/routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoutine(id: number): Promise<void> {
  await httpFetch<unknown>(`/routines/${id}`, { method: "DELETE" });
}

// ─── Shares ───────────────────────────────────────────────────────────────────

/**
 * Comparte una rutina con un alumno.
 * POST /routines/:id/share
 */
export async function shareRoutine(
  id: number,
  payload: { shared_with: number; notes?: string }
): Promise<RoutineShare> {
  return httpFetch<RoutineShare>(`/routines/${id}/share`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Lista los shares de rutinas emitidos por el coach.
 * GET /routines/shared/by-me
 */
export async function listRoutineShares(): Promise<RoutineShareSummary[]> {
  return httpFetch<RoutineShareSummary[]>("/routines/shared/by-me");
}

/**
 * Revoca un share de rutina.
 * DELETE /routines/share/:shareId
 */
export async function revokeRoutineShare(shareId: number): Promise<void> {
  await httpFetch<null>(`/routines/share/${shareId}`, { method: "DELETE" });
}
