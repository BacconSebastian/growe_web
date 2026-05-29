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
  if (params.q) query.set("q", params.q);
  if (params.muscleGroup) query.set("muscle_group", params.muscleGroup);
  if (params.page) query.set("page", String(params.page));
  const qs = query.toString();
  return httpFetch<ExercisesSearchResponse>(`/exercises/search${qs ? `?${qs}` : ""}`);
}

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  return httpFetch<MuscleGroup[]>("/exercises/muscle-groups");
}

export async function listMyExercises(params: {
  page?: number;
}): Promise<{ items: ExerciseCatalogItem[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
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
  payload: Partial<ExerciseCatalogItem>
): Promise<ExerciseCatalogItem> {
  return httpFetch<ExerciseCatalogItem>(`/exercises/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteExercise(id: number): Promise<void> {
  await httpFetch<unknown>(`/exercises/${id}`, { method: "DELETE" });
}
