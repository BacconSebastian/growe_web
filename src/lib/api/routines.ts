/**
 * routines.ts — API de rutinas propias del coach.
 */

import { httpFetch } from "./http";
import type { Routine, PaginationMeta } from "./types";

export interface RoutinesListResponse {
  items: Routine[];
  pagination: PaginationMeta;
}

export async function listRoutines(params: {
  page?: number;
  search?: string;
}): Promise<RoutinesListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
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
