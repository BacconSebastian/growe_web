/**
 * exercises.ts — API de ejercicios del catálogo y ejercicios custom del coach.
 */

import { httpFetch } from "./http";
import type { PaginationMeta } from "./types";

export interface ExerciseCatalogItem {
  id: number;
  name: string;
  description?: string | null;
  muscle_group?: string | null;
  is_custom?: boolean;
  created_by?: number | null;
}

export interface ExercisesSearchResponse {
  items: ExerciseCatalogItem[];
  pagination: PaginationMeta;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export async function searchExercises(params: {
  q?: string;
  muscleGroup?: string;
  page?: number;
}): Promise<ExercisesSearchResponse> {
  const query = new URLSearchParams();
  // El backend lee `query` y `muscle_group` (no `q`/`page`); devuelve un array.
  if (params.q) query.set("query", params.q);
  if (params.muscleGroup) query.set("muscle_group", params.muscleGroup);
  const qs = query.toString();
  const items = await httpFetch<ExerciseCatalogItem[]>(
    `/exercises/search${qs ? `?${qs}` : ""}`
  );
  return {
    items,
    pagination: {
      page: 1,
      per_page: items.length || 1,
      total: items.length,
      total_pages: 1,
    },
  };
}

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  // El backend devuelve [{ muscle_group: string }, …]; lo normalizamos a {id,name}.
  const rows = await httpFetch<{ muscle_group: string }[]>(
    "/exercises/muscle-groups"
  );
  return rows.map((r, i) => ({ id: i, name: r.muscle_group }));
}

export async function listMyExercises(params: {
  page?: number;
  per_page?: number;
  search?: string;
  muscle_group?: string;
}): Promise<{ items: ExerciseCatalogItem[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.search) query.set("search", params.search);
  if (params.muscle_group) query.set("muscle_group", params.muscle_group);
  const qs = query.toString();
  return httpFetch<{ items: ExerciseCatalogItem[]; pagination: PaginationMeta }>(
    `/exercises/mine${qs ? `?${qs}` : ""}`
  );
}

export async function createExercise(
  payload: Partial<ExerciseCatalogItem>
): Promise<ExerciseCatalogItem> {
  return httpFetch<ExerciseCatalogItem>("/exercises", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExercise(
  id: number,
  payload: Partial<ExerciseCatalogItem> & { muscle_groups?: string[] }
): Promise<ExerciseCatalogItem> {
  return httpFetch<ExerciseCatalogItem>(`/exercises/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteExercise(id: number): Promise<void> {
  await httpFetch<unknown>(`/exercises/${id}`, { method: "DELETE" });
}

/**
 * Sugiere grupos musculares (vía IA) a partir del nombre del ejercicio.
 * POST /exercises/suggest-muscle-groups → { suggestions: string[] }
 */
export async function suggestMuscleGroups(name: string): Promise<string[]> {
  const res = await httpFetch<{ suggestions: string[] }>(
    "/exercises/suggest-muscle-groups",
    { method: "POST", body: JSON.stringify({ name }) }
  );
  return res.suggestions ?? [];
}
